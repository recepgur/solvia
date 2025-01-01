from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from typing import Dict, List, Optional
import uuid
from datetime import datetime
import json
import os
import aiofiles
from pathlib import Path

from .models import (
    Message, Contact, UserProfile, MessageStatus, MessageType,
    CallSignal, CallState, CallSignalType, ICECandidate, db
)
from solana.rpc.api import Client
from solders.pubkey import Pubkey

# Create media directory if it doesn't exist
MEDIA_DIR = Path("media/voice_messages")
MEDIA_DIR.mkdir(parents=True, exist_ok=True)

class DateTimeEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, datetime):
            return obj.isoformat()
        return super().default(obj)

app = FastAPI()

# Disable CORS. Do not remove this for full-stack development.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

# WebSocket connection manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}

    async def connect(self, websocket: WebSocket, wallet_address: str):
        await websocket.accept()
        self.active_connections[wallet_address] = websocket

    def disconnect(self, wallet_address: str):
        self.active_connections.pop(wallet_address, None)

    async def send_message(self, message: Message, recipient_address: str):
        if recipient_address in self.active_connections:
            websocket = self.active_connections[recipient_address]
            message_dict = message.model_dump()
            
            # Update message status before sending
            message.status = MessageStatus.SENT
            
            try:
                json_str = json.dumps(message_dict, cls=DateTimeEncoder)
                await websocket.send_text(json_str)
                message.status = MessageStatus.DELIVERED
                message.offline = False
                return True
            except Exception as e:
                print(f"Failed to send message to {recipient_address}: {e}")
                message.offline = True
                return False
        else:
            message.offline = True
            return False
            
    async def send_call_signal(self, signal: CallSignal, recipient_address: str):
        if recipient_address in self.active_connections:
            websocket = self.active_connections[recipient_address]
            signal_dict = signal.model_dump()
            json_str = json.dumps(signal_dict, cls=DateTimeEncoder)
            await websocket.send_text(json_str)

manager = ConnectionManager()

# Authentication dependency
async def get_current_user(wallet_address: str) -> UserProfile:
    if wallet_address not in db.users:
        # Auto-register new users
        db.users[wallet_address] = UserProfile(wallet_address=wallet_address)
    return db.users[wallet_address]

# Health check endpoint
@app.get("/healthz")
async def healthz():
    return {"status": "ok"}

# Authentication endpoints
@app.post("/auth/connect-wallet")
async def connect_wallet(wallet_address: str, nft_mint_address: Optional[str] = None):
    if wallet_address not in db.users:
        db.users[wallet_address] = UserProfile(wallet_address=wallet_address)
    
    user = db.users[wallet_address]
    
    # If NFT mint address is provided, verify ownership
    if nft_mint_address:
        try:
            # Initialize Solana client
            client = Client("https://api.mainnet-beta.solana.com")
            
            # Convert addresses to Pubkey objects
            wallet_pubkey = Pubkey.from_string(wallet_address)
            nft_pubkey = Pubkey.from_string(nft_mint_address)
            
            # Get token accounts by owner
            token_accounts = client.get_token_accounts_by_owner(
                wallet_pubkey,
                {"mint": nft_pubkey}
            )
            
            # Check if the wallet owns the NFT
            has_nft = len(token_accounts.value) > 0
            
            # Update user profile
            user.has_nft_access = has_nft
            user.nft_mint_address = nft_mint_address if has_nft else None
            user.nft_verified_at = datetime.utcnow() if has_nft else None
            
            return {
                "status": "connected",
                "user": user,
                "nft_verified": has_nft
            }
            
        except Exception as e:
            print(f"NFT verification failed: {str(e)}")
            return {
                "status": "connected",
                "user": user,
                "nft_verified": False,
                "error": "NFT verification failed"
            }
    
    return {"status": "connected", "user": user}

@app.get("/auth/user-profile")
async def get_user_profile(user: UserProfile = Depends(get_current_user)):
    return user

# Messaging endpoints
@app.post("/messages/send")
async def send_message(
    content: str,
    recipient_address: str,
    wallet_address: str,
    message_type: MessageType = MessageType.TEXT,
    media_url: Optional[str] = None,
    user: UserProfile = Depends(get_current_user)
):
    message = Message(
        id=str(uuid.uuid4()),
        sender_address=wallet_address,
        recipient_address=recipient_address,
        content=content,
        message_type=message_type,
        media_url=media_url,
        status=MessageStatus.PENDING
    )
    db.messages[message.id] = message
    
    # Try to send via WebSocket if recipient is online
    try:
        await manager.send_message(message, recipient_address)
        message.status = MessageStatus.DELIVERED
        message.offline = False
    except Exception as e:
        print(f"Failed to deliver message: {e}")
        message.status = MessageStatus.SENT
        message.offline = True
    
    db.messages[message.id] = message  # Update message status in DB
    return message

@app.post("/messages/upload-voice")
async def upload_voice_message(
    file: UploadFile = File(...),
    user: UserProfile = Depends(get_current_user)
):
    file_id = str(uuid.uuid4())
    file_path = MEDIA_DIR / f"{file_id}.webm"
    
    async with aiofiles.open(file_path, 'wb') as out_file:
        content = await file.read()
        await out_file.write(content)
    
    return {
        "media_url": f"/messages/media/{file_id}.webm"
    }

@app.get("/messages/media/{filename}")
async def get_voice_message(
    filename: str,
    user: UserProfile = Depends(get_current_user)
):
    file_path = MEDIA_DIR / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Voice message not found")
    
    return FileResponse(
        file_path,
        media_type="audio/webm",
        filename=filename
    )

@app.get("/messages/history/{chat_id}")
async def get_message_history(
    chat_id: str,
    include_pending: bool = True,
    user: UserProfile = Depends(get_current_user)
):
    # In this simple implementation, chat_id is the other user's wallet address
    messages = [
        msg for msg in db.messages.values()
        if (msg.sender_address == user.wallet_address and msg.recipient_address == chat_id) or
           (msg.sender_address == chat_id and msg.recipient_address == user.wallet_address)
    ]
    
    # Filter out pending messages if not requested
    if not include_pending:
        messages = [msg for msg in messages if msg.status != MessageStatus.PENDING]
    
    return sorted(messages, key=lambda x: x.timestamp)

@app.post("/messages/sync")
async def sync_messages(
    last_sync: Optional[datetime] = None,
    user: UserProfile = Depends(get_current_user)
):
    """Sync messages for a user after reconnecting"""
    # Get all messages where user is recipient and status is not delivered
    pending_messages = [
        msg for msg in db.messages.values()
        if msg.recipient_address == user.wallet_address
        and msg.status != MessageStatus.DELIVERED
        and (last_sync is None or msg.timestamp > last_sync)
    ]
    
    # Try to deliver pending messages
    for message in pending_messages:
        try:
            await manager.send_message(message, user.wallet_address)
            message.status = MessageStatus.DELIVERED
            message.offline = False
            db.messages[message.id] = message
        except Exception as e:
            print(f"Failed to deliver message during sync: {e}")
    
    return {
        "synced_messages": pending_messages,
        "sync_time": datetime.utcnow()
    }

@app.get("/messages/status/{message_id}")
async def get_message_status(
    message_id: str,
    user: UserProfile = Depends(get_current_user)
):
    if message_id not in db.messages:
        raise HTTPException(status_code=404, detail="Message not found")
    message = db.messages[message_id]
    if message.sender_address != user.wallet_address:
        raise HTTPException(status_code=403, detail="Not authorized")
    return {"status": message.status}

# Contact management endpoints
@app.get("/contacts/list")
async def list_contacts(user: UserProfile = Depends(get_current_user)):
    return user.contacts

@app.post("/contacts/add")
async def add_contact(
    wallet_address: str,
    contact_address: str,
    display_name: Optional[str] = None,
    user: UserProfile = Depends(get_current_user)
):
    new_contact = Contact(
        wallet_address=contact_address,
        display_name=display_name,
        last_seen=datetime.utcnow()
    )
    user.contacts.append(new_contact)
    return new_contact

@app.delete("/contacts/remove")
async def remove_contact(
    wallet_address: str,
    user: UserProfile = Depends(get_current_user)
):
    user.contacts = [c for c in user.contacts if c.wallet_address != wallet_address]
    return {"status": "removed"}

# Call management endpoints
@app.post("/calls/start")
async def start_call(
    recipient_address: str,
    user: UserProfile = Depends(get_current_user)
):
    call_id = str(uuid.uuid4())
    call = CallState(
        call_id=call_id,
        caller_address=user.wallet_address,
        callee_address=recipient_address
    )
    db.calls[call_id] = call
    return call

@app.post("/calls/end/{call_id}")
async def end_call(
    call_id: str,
    user: UserProfile = Depends(get_current_user)
):
    if call_id not in db.calls:
        raise HTTPException(status_code=404, detail="Call not found")
    
    call = db.calls[call_id]
    if user.wallet_address not in [call.caller_address, call.callee_address]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    call.status = "ended"
    return call

@app.get("/calls/active")
async def get_active_calls(user: UserProfile = Depends(get_current_user)):
    return [
        call for call in db.calls.values()
        if call.status != "ended" and (
            call.caller_address == user.wallet_address or
            call.callee_address == user.wallet_address
        )
    ]

@app.get("/calls/{call_id}")
async def get_call_status(
    call_id: str,
    user: UserProfile = Depends(get_current_user)
):
    if call_id not in db.calls:
        raise HTTPException(status_code=404, detail="Call not found")
    
    call = db.calls[call_id]
    if user.wallet_address not in [call.caller_address, call.callee_address]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    return call

# WebSocket endpoint for real-time updates
@app.websocket("/messages/real-time")
async def websocket_endpoint(websocket: WebSocket, wallet_address: str):
    await manager.connect(websocket, wallet_address)
    try:
        while True:
            data = await websocket.receive_text()
            message_data = json.loads(data)
            
            if message_data.get("type") == "call_signal":
                signal = CallSignal(
                    call_id=message_data["call_id"],
                    signal_type=message_data["signal_type"],
                    sender_address=wallet_address,
                    recipient_address=message_data["recipient_address"],
                    data=message_data["data"]
                )
                
                # Store the signal
                if signal.call_id not in db.call_signals:
                    db.call_signals[signal.call_id] = []
                db.call_signals[signal.call_id].append(signal)
                
                # Update call state
                if signal.signal_type == CallSignalType.OFFER:
                    db.calls[signal.call_id] = CallState(
                        call_id=signal.call_id,
                        caller_address=wallet_address,
                        callee_address=signal.recipient_address
                    )
                elif signal.signal_type == CallSignalType.HANGUP:
                    if signal.call_id in db.calls:
                        db.calls[signal.call_id].status = "ended"
                
                # Forward the signal to recipient
                await manager.send_call_signal(signal, signal.recipient_address)
            
            elif message_data.get("type") == "ice_candidate":
                candidate = ICECandidate(
                    call_id=message_data["call_id"],
                    sender_address=wallet_address,
                    candidate=message_data["candidate"]
                )
                
                # Store the ICE candidate
                if candidate.call_id not in db.ice_candidates:
                    db.ice_candidates[candidate.call_id] = []
                db.ice_candidates[candidate.call_id].append(candidate)
                
                # Forward to the other peer
                call = db.calls.get(candidate.call_id)
                if call:
                    recipient = call.callee_address if wallet_address == call.caller_address else call.caller_address
                    signal = CallSignal(
                        call_id=candidate.call_id,
                        signal_type=CallSignalType.ICE_CANDIDATE,
                        sender_address=wallet_address,
                        recipient_address=recipient,
                        data={"candidate": candidate.candidate}
                    )
                    await manager.send_call_signal(signal, recipient)
                    
    except WebSocketDisconnect:
        manager.disconnect(wallet_address)
