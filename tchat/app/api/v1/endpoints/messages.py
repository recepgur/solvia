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
        # The token should be the wallet address
        return credentials.credentials
    except Exception:
        raise HTTPException(
            status_code=401,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

@router.post("/", response_model=Message, 
            summary="Send a new message",
            description="Send an encrypted message that will be stored on IPFS and Solana blockchain")
async def create_message(
    message: MessageCreate,
    wallet: str = Depends(get_current_wallet),
    signature: str = Header(None)
):
    try:
        # Generate encryption key for the message
        encryption_key = encryption.generate_key()
        
        # Encrypt the message content
        encrypted_content, key = encryption.encrypt_message(message.content, encryption_key)
        
        # Upload encrypted content to IPFS
        message_hash = await ipfs.upload_message(encrypted_content)
        if not message_hash:
            raise HTTPException(status_code=500, detail="Failed to upload message to IPFS")
        
        # Store message hash on Solana blockchain
        tx_signature = await solana.store_message_hash(
            sender=wallet,
            receiver=message.receiver_id,
            message_hash=message_hash
        )
        if not tx_signature:
            raise HTTPException(status_code=500, detail="Failed to store message on blockchain")
        
        return {
            "id": f"msg_{datetime.now().timestamp()}",
            "content": message.content,  # Return original content for the sender
            "sender_id": wallet,
            "receiver_id": message.receiver_id,
            "timestamp": datetime.now(),
            "is_encrypted": True,
            "media_url": message.media_url,
            "media_type": message.media_type,
            "message_hash": message_hash,
            "signature": tx_signature,
            "group_id": message.group_id
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/history", response_model=List[Message],
           summary="Get message history",
           description="Retrieve message history for a specific chat or group")
async def get_message_history(
    chat_id: str = Query(..., description="Chat or group ID"),
    limit: int = Query(50, description="Maximum number of messages to return"),
    before: Optional[datetime] = Query(None, description="Get messages before this timestamp"),
    wallet: str = Depends(get_current_wallet)
):
    try:
        # Get message history from Solana blockchain
        messages = await solana.get_message_history(wallet)
        
        decrypted_messages = []
        for msg in messages:
            try:
                # Get encrypted content from IPFS
                encrypted_content = await ipfs.get_message(msg["message_hash"])
                if not encrypted_content:
                    continue
                
                # Decrypt message content
                # Note: In a real implementation, the key would be shared securely between sender and receiver
                decrypted_content = encryption.decrypt_message(encrypted_content, msg["encryption_key"])
                
                decrypted_messages.append({
                    "id": msg["id"],
                    "content": decrypted_content,
                    "sender_id": msg["sender"],
                    "receiver_id": msg["receiver"],
                    "timestamp": datetime.fromtimestamp(msg["timestamp"]),
                    "is_encrypted": True,
                    "message_hash": msg["message_hash"],
                    "signature": msg["signature"],
                    "media_url": None,
                    "media_type": None,
                    "group_id": None
                })
            except Exception as e:
                print(f"Error decrypting message {msg['id']}: {e}")
                continue
        
        return decrypted_messages[:limit]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{message_id}",
              summary="Delete a message",
              description="Delete a message from the chat (marks as deleted on blockchain)")
async def delete_message(message_id: str):
    try:
        # TODO: Implement message deletion on Solana
        return {"status": "success", "message": "Message deleted"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/media", response_model=Message,
            summary="Upload media message",
            description="Upload and send a media message (image, video, audio, document)")
async def upload_media_message(
    message: MessageCreate,
    media_type: MediaType = Query(..., description="Type of media being uploaded")
):
    try:
        # TODO: Implement media upload to IPFS/Arweave
        return {
            "id": f"msg_{datetime.now().timestamp()}",
            "content": message.content,
            "sender_id": "temp_sender",
            "receiver_id": message.receiver_id,
            "timestamp": datetime.now(),
            "is_encrypted": message.is_encrypted,
            "media_url": "ipfs://temp_media_hash",
            "media_type": media_type,
            "message_hash": None,
            "signature": None,
            "group_id": message.group_id
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
