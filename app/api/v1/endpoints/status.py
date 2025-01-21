from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from fastapi.security import HTTPAuthorizationCredentials
from typing import List, Optional
from datetime import datetime
import json

from app.schemas.message import MediaType
from app.core.solana import SolanaManager
from app.core.ipfs import IPFSManager
from app.core.encryption import EncryptionManager
from .messages import get_current_wallet, security

router = APIRouter()

# Initialize core services
solana = SolanaManager()
ipfs = IPFSManager()

@router.post("/share",
            summary="Share a status update",
            description="Share a status that will be stored on IPFS and referenced on Solana blockchain")
async def share_status(
    content: str,
    media: Optional[UploadFile] = File(None),
    wallet: str = Depends(get_current_wallet)
):
    try:
        status_data = {
            "content": content,
            "timestamp": datetime.now().isoformat(),
            "wallet": wallet
        }
        
        # If media is provided, upload to IPFS
        if media:
            media_content = await media.read()
            media_hash = await ipfs.upload_file(media_content)
            if media_hash:
                status_data["media_hash"] = media_hash
                content_type = getattr(media, 'content_type', None)
                if content_type:
                    status_data["media_type"] = (
                        MediaType.IMAGE if content_type.startswith('image/') else
                        MediaType.VIDEO if content_type.startswith('video/') else
                        MediaType.AUDIO if content_type.startswith('audio/') else
                        MediaType.DOCUMENT
                    )
                else:
                    status_data["media_type"] = MediaType.DOCUMENT
        
        # Upload status to IPFS
        status_json = json.dumps(status_data)
        status_hash = await ipfs.upload_message(status_json)
        
        if not status_hash:
            raise HTTPException(status_code=500, detail="Failed to upload status to IPFS")
        
        # Store status reference on Solana
        tx_signature = await solana.store_message_hash(
            sender=wallet,
            receiver=wallet,  # Status updates are self-addressed
            message_hash=status_hash
        )
        
        if not tx_signature:
            raise HTTPException(status_code=500, detail="Failed to store status on blockchain")
        
        return {
            "status_hash": status_hash,
            "signature": tx_signature,
            "timestamp": datetime.now()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/list",
           summary="Get status updates",
           description="Get recent status updates for a wallet")
async def get_status_updates(
    wallet_address: Optional[str] = None,
    limit: int = 10,
    wallet: str = Depends(get_current_wallet)
):
    try:
        target_wallet = wallet_address or wallet
        # Get status updates from Solana
        messages = await solana.get_message_history(target_wallet)
        
        status_updates = []
        for msg in messages:
            try:
                if msg["sender"] != msg["receiver"]:  # Skip non-status messages
                    continue
                    
                # Get status content from IPFS
                status_json = await ipfs.get_message(msg["message_hash"])
                if not status_json:
                    continue
                
                status_data = json.loads(status_json)
                status_updates.append({
                    "content": status_data["content"],
                    "timestamp": status_data["timestamp"],
                    "wallet": status_data["wallet"],
                    "media_hash": status_data.get("media_hash"),
                    "media_type": status_data.get("media_type"),
                    "status_hash": msg["message_hash"],
                    "signature": msg["signature"]
                })
            except Exception as e:
                print(f"Error processing status {msg['message_hash']}: {e}")
                continue
        
        return sorted(
            status_updates,
            key=lambda x: x["timestamp"],
            reverse=True
        )[:limit]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
