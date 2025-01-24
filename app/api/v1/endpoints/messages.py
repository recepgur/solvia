from fastapi import APIRouter, WebSocket, HTTPException, Depends, Query, UploadFile, File, Header
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import List, Optional
from datetime import datetime
import json

from app.schemas.message import MessageCreate, Message, MediaType
from app.core.solana import SolanaManager
from app.core.ipfs import IPFSManager
from app.core.encryption import EncryptionManager
from app.core.webrtc import WebRTCSignaling

router = APIRouter()
security = HTTPBearer()

# Initialize core services
solana = SolanaManager()
ipfs = IPFSManager()
encryption = EncryptionManager()

async def get_current_wallet(credentials: HTTPAuthorizationCredentials = Depends(security)) -> str:
    """Get the current wallet address from the bearer token"""
    try:
        return credentials.credentials
    except Exception:
        raise HTTPException(
            status_code=401,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

@router.post("/", response_model=Message)
async def create_message(message: MessageCreate, wallet: str = Depends(get_current_wallet)):
    """Create a new message"""
    try:
        # Generate encryption key
        encryption_key = encryption.generate_key()
        
        # Encrypt message content
        encrypted_content = encryption.encrypt_message(message.content, encryption_key)
        
        # Upload to IPFS
        message_hash = await ipfs.upload_message(encrypted_content)
        
        if not message_hash:
            raise HTTPException(status_code=500, detail="Failed to upload to IPFS")
        
        # Store on Solana
        tx_signature = await solana.store_message_hash(
            sender=wallet,
            receiver=message.receiver_id,
            message_hash=message_hash
        )
        
        if not tx_signature:
            raise HTTPException(status_code=500, detail="Failed to store on blockchain")
        
        return {
            "id": f"msg_{datetime.now().timestamp()}",
            "content": message.content,
            "sender_id": wallet,
            "receiver_id": message.receiver_id,
            "timestamp": datetime.now(),
            "message_hash": message_hash,
            "signature": tx_signature
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/history", response_model=List[Message])
async def get_message_history(
    wallet: str = Depends(get_current_wallet),
    limit: int = Query(50, description="Maximum number of messages to return")
):
    """Get message history"""
    try:
        messages = await solana.get_message_history(wallet)
        return messages[:limit]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
