from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from fastapi.security import HTTPAuthorizationCredentials
from typing import List, Optional
from datetime import datetime
import json

from app.schemas.message import MediaType
from app.core.solana import SolanaManager
from app.core.ipfs import IPFSManager
from .messages import get_current_wallet, security

router = APIRouter()
solana = SolanaManager()
ipfs = IPFSManager()

@router.post("/share")
async def share_status(
    content: str,
    media: Optional[UploadFile] = File(None),
    wallet: str = Depends(get_current_wallet)
):
    """Share a status update"""
    try:
        status_data = {
            "content": content,
            "timestamp": datetime.now().isoformat(),
            "wallet": wallet
        }
        
        if media:
            media_content = await media.read()
            media_hash = await ipfs.upload_file(media_content)
            if media_hash:
                status_data["media_hash"] = media_hash
                status_data["media_type"] = MediaType.IMAGE
        
        status_json = json.dumps(status_data)
        status_hash = await ipfs.upload_message(status_json)
        
        if not status_hash:
            raise HTTPException(status_code=500, detail="Failed to upload status")
        
        tx_signature = await solana.store_message_hash(
            sender=wallet,
            receiver=wallet,
            message_hash=status_hash
        )
        
        return {
            "status_hash": status_hash,
            "signature": tx_signature,
            "timestamp": datetime.now()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/list")
async def get_status_updates(
    wallet_address: Optional[str] = None,
    limit: int = 10,
    wallet: str = Depends(get_current_wallet)
):
    """Get status updates"""
    try:
        target_wallet = wallet_address or wallet
        messages = await solana.get_message_history(target_wallet)
        
        status_updates = []
        for msg in messages:
            if msg["sender"] != msg["receiver"]:
                continue
            
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
        
        return sorted(
            status_updates,
            key=lambda x: x["timestamp"],
            reverse=True
        )[:limit]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
