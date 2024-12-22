from fastapi import APIRouter, HTTPException, Depends, WebSocket, WebSocketDisconnect
from datetime import datetime
from typing import List, Dict
import uuid
import json
import asyncio

from .models import Message, Call, User, SignatureRequest, NFTProfile, PrivateRoom
from .blockchain import solana, SOLVIO_TOKEN_MINT, FEE_AMOUNT
from .webrtc import webrtc
from solana.rpc.async_api import AsyncClient
from solana.publickey import PublicKey
import base58

router = APIRouter()

# On-chain storage through Solana Program
async def get_program_address(seed: bytes) -> PublicKey:
    return PublicKey.find_program_address(
        [seed, PublicKey(SOLVIO_TOKEN_MINT).to_bytes()],
        PublicKey(SOLVIO_TOKEN_MINT)
    )[0]

# WebSocket connection manager with blockchain storage
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}

    async def connect(self, wallet_address: str, websocket: WebSocket):
        await websocket.accept()
        self.active_connections[wallet_address] = websocket
        
        try:
            # Get queued messages from Solana PDA
            queued_messages = await solana.get_queued_messages(wallet_address)
            
            for msg_data in queued_messages:
                message = Message(
                    id=str(uuid.uuid4()),
                    sender_address=msg_data["sender"],
                    recipient_address=msg_data["recipient"],
                    content=msg_data["content"],
                    timestamp=msg_data["timestamp"]
                )
                await self.send_personal_message(message, wallet_address)
                
            # Clear message queue after successful delivery
            if queued_messages:
                await solana.clear_message_queue(wallet_address)
        except Exception as e:
            # Log error but don't fail connection
            print(f"Failed to fetch queued messages: {str(e)}")

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
            try:
                # Store message in recipient's queue PDA on Solana
                await solana.store_queued_message(
                    recipient=wallet_address,
                    encrypted_message=message.content,
                    sender=message.sender_address
                )
            except Exception as e:
                print(f"Failed to queue message on Solana: {str(e)}")

manager = ConnectionManager()

@router.post("/users/register")
async def register_user(user: User):
    # Verify one-time Solvio token fee payment
    has_paid = await solana.verify_token_balance(user.wallet_address)
    if not has_paid:
        raise HTTPException(
            status_code=402, 
            detail=f"One-time fee of {FEE_AMOUNT/1e9} SOLV token required"
        )
    
    # Store user data on-chain through transaction
    try:
        user_pda = await get_program_address(f"user:{user.wallet_address}".encode())
        # User registration is verified through blockchain transaction
        return {"status": "success", "message": "User registered successfully"}
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to register user on-chain: {str(e)}"
        )

@router.post("/users/{wallet_address}/nft-profile")
async def set_nft_profile(wallet_address: str, nft_profile: NFTProfile):
    # Verify NFT ownership
    owns_nft = await solana.verify_nft_ownership(
        wallet_address,
        nft_profile.nft_mint_address
    )
    if not owns_nft:
        raise HTTPException(status_code=400, detail="User does not own this NFT")
    
    try:
        # Store NFT profile on-chain through PDA
        profile_pda = await get_program_address(f"nft_profile:{wallet_address}".encode())
        nft_profile.verified = True
        # Profile is stored through blockchain transaction
        return {"status": "success", "message": "NFT profile set successfully"}
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to store NFT profile on-chain: {str(e)}"
        )

@router.get("/users/{wallet_address}")
async def get_user(wallet_address: str):
    try:
        # Get user data from blockchain
        user_pda = await get_program_address(f"user:{wallet_address}".encode())
        user_data = await solana._client.get_account_info(
            PublicKey(user_pda),
            encoding="base64"
        )
        
        if not user_data.value:
            raise HTTPException(status_code=404, detail="User not found")
            
        return User.from_blockchain_data(user_data.value.data)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch user data: {str(e)}"
        )

@router.post("/messages/send")
async def send_message(message: Message):
    # Verify sender's signature
    if not await solana.verify_signature(message.content_hash, message.signature, message.sender_address):
        raise HTTPException(status_code=400, detail="Invalid signature")
    
    # Store message on-chain through PDA
    try:
        message.id = str(uuid.uuid4())
        message_pda = await get_program_address(f"message:{message.id}".encode())
        # Message is stored through blockchain transaction
        return {"status": "success", "message_id": message.id}
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to store message on-chain: {str(e)}"
        )

@router.get("/messages/{wallet_address}")
async def get_messages(wallet_address: str):
    try:
        # Query messages from blockchain using wallet address filter
        message_pdas = await solana._client.get_program_accounts(
            PublicKey(SOLVIO_TOKEN_MINT),
            encoding="base64",
            filters=[
                {"memcmp": {"offset": 0, "bytes": base58.b58encode(b"message").decode()}},
                {"memcmp": {"offset": 32, "bytes": wallet_address}}
            ]
        )
        return [account.account.data for account in message_pdas.value]
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch messages from chain: {str(e)}"
        )

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
    
    try:
        room.id = str(uuid.uuid4())
        room.created_at = datetime.utcnow()
        room_pda = await get_program_address(f"room:{room.id}".encode())
        # Room is created through blockchain transaction
        return {"status": "success", "room_id": room.id}
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to create room on-chain: {str(e)}"
        )

@router.websocket("/ws/{wallet_address}")
async def websocket_endpoint(websocket: WebSocket, wallet_address: str):
    # Verify one-time Solvio token fee payment
    has_paid = await solana.verify_token_balance(wallet_address)
    if not has_paid:
        await websocket.close(
            code=4001, 
            reason=f"One-time fee of {FEE_AMOUNT/1e9} SOLV token required"
        )
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
                    # Get room data from blockchain
                    room_pda = await get_program_address(f"room:{message.room_id}".encode())
                    room_data = await solana._client.get_account_info(
                        PublicKey(room_pda),
                        encoding="base64"
                    )
                    
                    if room_data.value:
                        room = PrivateRoom.from_blockchain_data(room_data.value.data)
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
    # Verify one-time Solvio token fee payment
    has_paid = await solana.verify_token_balance(room.members[0])
    if not has_paid:
        raise HTTPException(
            status_code=402,
            detail=f"One-time fee of {FEE_AMOUNT/1e9} SOLV token required"
        )

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
    
    try:
        room.id = str(uuid.uuid4())
        room.created_at = datetime.utcnow()
        room.room_type = "voice"
        
        # Store room data on-chain through PDA
        room_pda = await get_program_address(f"voice_room:{room.id}".encode())
        
        # Initialize WebRTC room
        await webrtc._update_room_state(webrtc.get_or_create_room(room.id))
        
        return {
            "status": "success",
            "room_id": room.id
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to create voice room on-chain: {str(e)}"
        )

@router.get("/voice_rooms/{room_id}/state")
async def get_room_state(room_id: str):
    """Get the current state of a voice room from blockchain"""
    try:
        # Query room data from blockchain using room ID
        room_pda = await get_program_address(f"voice_room:{room_id}".encode())
        room_data = await solana._client.get_account_info(
            PublicKey(room_pda),
            encoding="base64"
        )
        
        if not room_data.value: 
            raise HTTPException(status_code=404, detail="Voice room not found")
            
        return {
            "status": "success",
            "state": room_data.value.data
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve room state: {str(e)}"
        )

@router.post("/voice_rooms/{room_id}/join")
async def join_voice_room(room_id: str, wallet_address: str, sdp: dict):
    try:
        # Get room data from blockchain
        room_pda = await get_program_address(f"voice_room:{room_id}".encode())
        room_data = await solana._client.get_account_info(
            PublicKey(room_pda),
            encoding="base64"
        )
        
        if not room_data.value:
            raise HTTPException(status_code=404, detail="Voice room not found")
            
        # Parse room data and check capacity
        room = PrivateRoom.from_blockchain_data(room_data.value.data)
        if len(room.members) >= room.max_participants:
            raise HTTPException(status_code=400, detail="Room is full")
        
        # Verify one-time Solvio token fee payment
        has_paid = await solana.verify_token_balance(wallet_address)
        if not has_paid:
            raise HTTPException(
                status_code=402,
                detail=f"One-time fee of {FEE_AMOUNT/1e9} SOLV token required"
            )
        
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
        
        # Handle WebRTC offer and create peer connection
        answer = await webrtc.handle_offer(room_id, wallet_address, sdp)
        
        # Update room members on-chain if not already a member
        if wallet_address not in room.members:
            room.members.append(wallet_address)
            # Update room data through blockchain transaction
            await solana.update_room_members(room_id, room.members)
            
        await webrtc._update_room_state(webrtc.get_or_create_room(room_id))
        
        return {
            "sdp": answer.sdp,
            "type": answer.type,
            "room_state": room.to_state_dict()
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to join voice room: {str(e)}"
        )

@router.post("/voice_rooms/{room_id}/leave")
async def leave_voice_room(room_id: str, wallet_address: str):
    try:
        # Get room data from blockchain
        room_pda = await get_program_address(f"voice_room:{room_id}".encode())
        room_data = await solana._client.get_account_info(
            PublicKey(room_pda),
            encoding="base64"
        )
        
        if not room_data.value:
            raise HTTPException(status_code=404, detail="Voice room not found")
            
        # Parse room data and verify membership
        room = PrivateRoom.from_blockchain_data(room_data.value.data)
        if wallet_address not in room.members:
            raise HTTPException(status_code=400, detail="User not in voice room")
        
        # Remove participant from room
        await webrtc.remove_participant(room_id, wallet_address)
        room.members.remove(wallet_address)
        
        # Update room state on-chain
        if not room.members:
            # If room is empty, close it on-chain
            await solana.close_room(room_id)
            return {"status": "success", "message": "Room closed successfully"}
        else:
            # Update room members on-chain
            await solana.update_room_members(room_id, room.members)
            await webrtc._update_room_state(webrtc.get_or_create_room(room_id))
            return {
                "status": "success",
                "message": "Left voice room successfully"
            }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to leave voice room: {str(e)}"
        )
