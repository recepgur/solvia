from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
from datetime import datetime
import json

from app.core.solana import SolanaManager
from app.core.ipfs import IPFSManager
from .messages import get_current_wallet, security

router = APIRouter()
solana = SolanaManager()
ipfs = IPFSManager()

@router.get("/sync")
async def sync_offline_messages(
    last_sync: Optional[datetime] = None,
    wallet: str = Depends(get_current_wallet)
):
    """Sync offline messages"""
    try:
        messages = await solana.get_message_history(wallet)
        
        if last_sync:
            messages = [
                msg for msg in messages
                if datetime.fromisoformat(msg["timestamp"]) > last_sync
            ]
        
        return messages
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/store")
async def store_offline_message(
    message_hash: str,
    recipient: str,
    wallet: str = Depends(get_current_wallet)
):
    """Store an offline message"""
    try:
        tx_signature = await solana.store_message_hash(
            sender=wallet,
            receiver=recipient,
            message_hash=message_hash
        )
        
        return {
            "message_hash": message_hash,
            "signature": tx_signature,
            "timestamp": datetime.now()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
