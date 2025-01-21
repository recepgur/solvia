from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
from datetime import datetime
import json

from app.schemas.message import MessageCreate, Message, MediaType
from app.core.solana import SolanaManager
from app.core.ipfs import IPFSManager
from app.core.encryption import EncryptionManager
from .messages import get_current_wallet, security

router = APIRouter()

# Initialize core services
solana = SolanaManager()
ipfs = IPFSManager()
encryption = EncryptionManager()

@router.post("/create",
            summary="Create a new group",
            description="Create a new group chat with initial members")
async def create_group(
    name: str,
    members: List[str],
    wallet: str = Depends(get_current_wallet)
):
    try:
        group_data = {
            "name": name,
            "creator": wallet,
            "members": [wallet] + members,
            "created_at": datetime.now().isoformat()
        }
        
        # Store group data on IPFS
        group_json = json.dumps(group_data)
        group_hash = await ipfs.upload_message(group_json)
        
        if not group_hash:
            raise HTTPException(status_code=500, detail="Failed to create group")
        
        # Store group reference on Solana
        tx_signature = await solana.store_message_hash(
            sender=wallet,
            receiver=wallet,  # Group creator is the owner
            message_hash=group_hash
        )
        
        return {
            "group_id": group_hash,
            "name": name,
            "members": group_data["members"],
            "created_at": group_data["created_at"],
            "signature": tx_signature
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{group_id}/message",
            response_model=Message,
            summary="Send a group message",
            description="Send a message to a group chat")
async def send_group_message(
    group_id: str,
    message: MessageCreate,
    wallet: str = Depends(get_current_wallet)
):
    try:
        # Verify group membership
        group_data = await ipfs.get_message(group_id)
        if not group_data:
            raise HTTPException(status_code=404, detail="Group not found")
        
        group = json.loads(group_data)
        if wallet not in group["members"]:
            raise HTTPException(status_code=403, detail="Not a group member")
        
        # Generate encryption key for the message
        encryption_key = encryption.generate_key()
        
        # Encrypt the message content
        encrypted_content, key = encryption.encrypt_message(message.content, encryption_key)
        
        # Upload encrypted content to IPFS
        message_hash = await ipfs.upload_message(encrypted_content)
        if not message_hash:
            raise HTTPException(status_code=500, detail="Failed to upload message")
        
        # Store message hash on Solana
        tx_signature = await solana.store_message_hash(
            sender=wallet,
            receiver=group_id,  # Use group_id as receiver
            message_hash=message_hash
        )
        
        return {
            "id": f"msg_{datetime.now().timestamp()}",
            "content": message.content,
            "sender_id": wallet,
            "receiver_id": group_id,
            "timestamp": datetime.now(),
            "is_encrypted": True,
            "media_url": message.media_url,
            "media_type": message.media_type,
            "message_hash": message_hash,
            "signature": tx_signature,
            "group_id": group_id
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
