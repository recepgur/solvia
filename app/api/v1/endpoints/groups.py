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

@router.post("/create")
async def create_group(
    name: str,
    members: List[str],
    wallet: str = Depends(get_current_wallet)
):
    """Create a new group"""
    try:
        group_data = {
            "name": name,
            "members": [wallet, *members],
            "created_at": datetime.now().isoformat(),
            "created_by": wallet
        }
        
        group_json = json.dumps(group_data)
        group_hash = await ipfs.upload_message(group_json)
        
        if not group_hash:
            raise HTTPException(status_code=500, detail="Failed to create group")
        
        # Store group reference on Solana
        tx_signature = await solana.store_message_hash(
            sender=wallet,
            receiver=wallet,
            message_hash=group_hash
        )
        
        return {
            "group_hash": group_hash,
            "signature": tx_signature,
            "name": name,
            "members": group_data["members"],
            "created_at": group_data["created_at"]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/list")
async def get_groups(wallet: str = Depends(get_current_wallet)):
    """Get groups for a wallet"""
    try:
        messages = await solana.get_message_history(wallet)
        
        groups = []
        for msg in messages:
            if msg["sender"] != msg["receiver"]:
                continue
            
            group_json = await ipfs.get_message(msg["message_hash"])
            if not group_json:
                continue
            
            try:
                group_data = json.loads(group_json)
                if wallet in group_data.get("members", []):
                    groups.append({
                        "id": msg["message_hash"],
                        "name": group_data["name"],
                        "members": group_data["members"],
                        "created_at": group_data["created_at"],
                        "created_by": group_data["created_by"]
                    })
            except:
                continue
        
        return groups
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
