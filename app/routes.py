from fastapi import APIRouter, HTTPException, Depends, WebSocket, WebSocketDisconnect
from datetime import datetime
from typing import List, Dict
import uuid
import json
import asyncio

from .models import Message, Call, User, SignatureRequest, NFTProfile, PrivateRoom
from .blockchain import solana
from .storage import ipfs
from .webrtc import webrtc

router = APIRouter()

# In-memory storage for demo (replace with proper database in production)
users = {}
messages = {}
calls = {}
rooms = {}

# WebSocket connection manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
        self.offline_messages: Dict[str, List[Message]] = {}

    async def connect(self, wallet_address: str, websocket: WebSocket):
        await websocket.accept()
        self.active_connections[wallet_address] = websocket
        # Send any offline messages
        if wallet_address in self.offline_messages:
            for msg in self.offline_messages[wallet_address]:
                await self.send_personal_message(msg, wallet_address)
            del self.offline_messages[wallet_address]

    def disconnect(self, wallet_address: str):
        if wallet_address in self.active_connections:
            del self.active_connections[wallet_address]

    async def send_personal_message(self, message: Message, wallet_address: str):
        if wallet_address in self.active_connections:
            await self.active_connections[wallet_address].send_json({
                "type": "message",
                "data": message.dict()
            })
        else:
            if wallet_address not in self.offline_messages:
                self.offline_messages[wallet_address] = []
            self.offline_messages[wallet_address].append(message)

manager = ConnectionManager()

@router.post("/users/register")
async def register_user(user: User):
    # Verify Solvio token balance
    has_balance = await solana.verify_token_balance(user.wallet_address, 0.1)
    if not has_balance:
        raise HTTPException(status_code=400, detail="Insufficient Solvio token balance")
    
    users[user.wallet_address] = user
    return {"status": "success", "message": "User registered successfully"}

@router.post("/users/{wallet_address}/nft-profile")
async def set_nft_profile(wallet_address: str, nft_profile: NFTProfile):
    if wallet_address not in users:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Verify NFT ownership
    owns_nft = await solana.verify_nft_ownership(
        wallet_address,
        nft_profile.nft_mint_address
    )
    if not owns_nft:
        raise HTTPException(status_code=400, detail="User does not own this NFT")
    
    # Store NFT profile
    nft_profile.verified = True
    users[wallet_address].nft_profile = nft_profile
    return {"status": "success", "message": "NFT profile set successfully"}

@router.get("/users/{wallet_address}")
async def get_user(wallet_address: str):
    if wallet_address not in users:
        raise HTTPException(status_code=404, detail="User not found")
    return users[wallet_address]

@router.post("/messages/send")
async def send_message(message: Message):
    # Verify sender's signature
    if not await solana.verify_signature(message.content_hash, message.signature, message.sender_address):
        raise HTTPException(status_code=400, detail="Invalid signature")
    
    # Store message in IPFS
    try:
        content_hash = await ipfs.store_message(message.content_hash)
        message.id = str(uuid.uuid4())
        messages[message.id] = message
        return {"status": "success", "message_id": message.id, "ipfs_hash": content_hash}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/messages/{wallet_address}")
async def get_messages(wallet_address: str):
    user_messages = [msg for msg in messages.values() 
                    if msg.recipient_address == wallet_address or msg.sender_address == wallet_address]
    return user_messages

@router.post("/rooms/create")
async def create_private_room(room: PrivateRoom):
    # Verify room creator owns required NFT
    owns_nft = await solana.verify_nft_ownership(
        room.members[0],  # Creator is first member
        room.required_nft_collection
    )
    if not owns_nft:
        raise HTTPException(
            status_code=400,
            detail="Room creator must own NFT from required collection"
        )
    
    room.id = str(uuid.uuid4())
    room.created_at = datetime.utcnow()
    rooms[room.id] = room
    return {"status": "success", "room_id": room.id}

@router.websocket("/ws/{wallet_address}")
async def websocket_endpoint(websocket: WebSocket, wallet_address: str):
    # Verify Solvio token balance before allowing connection
    has_balance = await solana.verify_token_balance(wallet_address, 0.1)
    if not has_balance:
        await websocket.close(code=4001, reason="Insufficient Solvio token balance")
        return
    
    await manager.connect(wallet_address, websocket)
    try:
        while True:
            data = await websocket.receive_json()
            # Handle different message types
            if data["type"] == "message":
                message = Message(**data["data"])
                # For private rooms, verify NFT ownership
                if message.room_id:
                    room = rooms.get(message.room_id)
                    if room:
                        owns_nft = await solana.verify_nft_ownership(
                            wallet_address,
                            room.required_nft_collection
                        )
                        if not owns_nft:
                            continue
                
                await manager.send_personal_message(message, message.recipient_address)
            
    except WebSocketDisconnect:
        manager.disconnect(wallet_address)

@router.post("/voice_rooms/create")
async def create_voice_room(room: PrivateRoom):
    # Verify Solvio token balance
    has_balance = await solana.verify_token_balance(room.members[0], room.token_requirement)
    if not has_balance:
        raise HTTPException(status_code=400, detail="Insufficient Solvio token balance")

    # Verify NFT ownership for room creation
    owns_nft = await solana.verify_nft_ownership(
        room.members[0],  # Creator is first member
        room.required_nft_collection
    )
    if not owns_nft:
        raise HTTPException(
            status_code=400,
            detail="Room creator must own NFT from required collection"
        )
    
    room.id = str(uuid.uuid4())
    room.created_at = datetime.utcnow()
    room.room_type = "voice"
    rooms[room.id] = room
    
    # Store initial room state in IPFS
    try:
        state_hash = await ipfs.store_room_state(room.id, room.to_state_dict())
        room.state_hash = state_hash
        await webrtc._update_room_state(webrtc.get_or_create_room(room.id))
        
        return {
            "status": "success",
            "room_id": room.id,
            "state_hash": state_hash
        }
    except Exception as e:
        del rooms[room.id]  # Cleanup on failure
        raise HTTPException(
            status_code=500,
            detail=f"Failed to store room state: {str(e)}"
        )

@router.get("/voice_rooms/{room_id}/state")
async def get_room_state(room_id: str):
    """Get the current state of a voice room from IPFS"""
    if room_id not in rooms:
        raise HTTPException(status_code=404, detail="Voice room not found")
    
    room = rooms[room_id]
    if not room.state_hash:
        raise HTTPException(status_code=404, detail="Room state not found")
    
    try:
        state = await ipfs.retrieve_room_state(room.state_hash)
        return {
            "status": "success",
            "state": state
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve room state: {str(e)}"
        )

@router.post("/voice_rooms/{room_id}/join")
async def join_voice_room(room_id: str, wallet_address: str, sdp: dict):
    if room_id not in rooms:
        raise HTTPException(status_code=404, detail="Voice room not found")
    
    room = rooms[room_id]
    if len(room.members) >= room.max_participants:
        raise HTTPException(status_code=400, detail="Room is full")
    
    # Verify Solvio token balance
    has_balance = await solana.verify_token_balance(wallet_address, room.token_requirement)
    if not has_balance:
        raise HTTPException(status_code=400, detail="Insufficient Solvio token balance")
    
    # Verify NFT ownership for room access
    owns_nft = await solana.verify_nft_ownership(
        wallet_address,
        room.required_nft_collection
    )
    if not owns_nft:
        raise HTTPException(
            status_code=400,
            detail="User must own NFT from required collection"
        )
    
    try:
        # Handle WebRTC offer and create peer connection
        answer = await webrtc.handle_offer(room_id, wallet_address, sdp)
        if wallet_address not in room.members:
            room.members.append(wallet_address)
        
        # Update and store room state in IPFS
        state_hash = await ipfs.store_room_state(room_id, room.to_state_dict())
        room.state_hash = state_hash
        await webrtc._update_room_state(webrtc.get_or_create_room(room_id))
        
        return {
            "sdp": answer.sdp,
            "type": answer.type,
            "state_hash": state_hash,
            "room_state": room.to_state_dict()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/voice_rooms/{room_id}/leave")
async def leave_voice_room(room_id: str, wallet_address: str):
    if room_id not in rooms:
        raise HTTPException(status_code=404, detail="Voice room not found")
    
    room = rooms[room_id]
    if wallet_address not in room.members:
        raise HTTPException(status_code=400, detail="User not in voice room")
    
    # Remove participant from room
    await webrtc.remove_participant(room_id, wallet_address)
    room.members.remove(wallet_address)
    
    try:
        # If room is empty, clean up
        if not room.members:
            del rooms[room_id]
            return {"status": "success", "message": "Room closed successfully"}
        else:
            # Update room state in IPFS
            state_hash = await ipfs.store_room_state(room_id, room.to_state_dict())
            room.state_hash = state_hash
            await webrtc._update_room_state(webrtc.get_or_create_room(room_id))
            return {
                "status": "success",
                "message": "Left voice room successfully",
                "state_hash": state_hash
            }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to update room state: {str(e)}"
        )
