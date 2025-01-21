from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from typing import List, Optional
from datetime import datetime, timedelta
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

@router.post("/queue",
            response_model=Message,
            summary="Queue a message for offline delivery",
            description="Store a message on IPFS for later delivery when recipient comes online")
async def queue_message(
    message: MessageCreate,
    wallet: str = Depends(get_current_wallet)
):
    try:
        # Generate encryption key for the message
        encryption_key = encryption.generate_key()
        
        # Encrypt the message content
        encrypted_content, key = encryption.encrypt_message(message.content, encryption_key)
        
        # Create offline message metadata
        offline_data = {
            "sender": wallet,
            "receiver": message.receiver_id,
            "timestamp": datetime.now().isoformat(),
            "expires_at": (datetime.now() + timedelta(days=7)).isoformat(),  # Messages expire after 7 days
            "encrypted_content": encrypted_content,
            "encryption_key": key,
            "media_url": message.media_url,
            "media_type": message.media_type.value if message.media_type else None,
            "is_group_message": bool(message.group_id),
            "group_id": message.group_id
        }
        
        # Upload offline message to IPFS
        offline_json = json.dumps(offline_data)
        message_hash = await ipfs.upload_message(offline_json)
        
        if not message_hash:
            raise HTTPException(status_code=500, detail="Failed to queue offline message")
        
        # Store reference on Solana
        tx_signature = await solana.store_message_hash(
            sender=wallet,
            receiver=message.receiver_id,
            message_hash=message_hash
        )
        
        return {
            "id": f"msg_{datetime.now().timestamp()}",
            "content": message.content,  # Return original content for sender
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

@router.get("/sync",
           response_model=List[Message],
           summary="Sync offline messages",
           description="Retrieve queued messages that were sent while offline")
async def sync_messages(
    before: Optional[datetime] = None,
    wallet: str = Depends(get_current_wallet)
):
    try:
        # Get message history from Solana
        messages = await solana.get_message_history(wallet)
        
        offline_messages = []
        for msg in messages:
            try:
                # Get offline message data from IPFS
                offline_data = await ipfs.get_message(msg["message_hash"])
                if not offline_data:
                    continue
                
                data = json.loads(offline_data)
                
                # Skip if message has expired
                expires_at = datetime.fromisoformat(data["expires_at"])
                if datetime.now() > expires_at:
                    continue
                
                # Skip messages that are not offline messages
                if "encrypted_content" not in data:
                    continue
                
                # Decrypt message content
                decrypted_content = encryption.decrypt_message(
                    data["encrypted_content"],
                    data["encryption_key"]
                )
                
                offline_messages.append({
                    "id": f"msg_{datetime.now().timestamp()}",
                    "content": decrypted_content,
                    "sender_id": data["sender"],
                    "receiver_id": data["receiver"],
                    "timestamp": datetime.fromisoformat(data["timestamp"]),
                    "is_encrypted": True,
                    "media_url": data["media_url"],
                    "media_type": MediaType(data["media_type"]) if data["media_type"] else None,
                    "message_hash": msg["message_hash"],
                    "signature": msg["signature"],
                    "group_id": data["group_id"]
                })
            except Exception as e:
                print(f"Error processing offline message {msg['message_hash']}: {e}")
                continue
        
        # Sort messages by timestamp
        offline_messages.sort(key=lambda x: x["timestamp"], reverse=True)
        
        # Filter messages by timestamp if specified
        if before:
            offline_messages = [
                msg for msg in offline_messages
                if msg["timestamp"] < before
            ]
        
        return offline_messages
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
