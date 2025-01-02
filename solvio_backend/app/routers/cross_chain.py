from fastapi import APIRouter, Depends, HTTPException
from typing import List
from ..models import Message, UserProfile, ChainType, CrossChainStatus, MessageStatus
from ..services.bridge_service import bridge_service
from ..main import get_current_user, db

router = APIRouter(prefix="/cross-chain", tags=["cross-chain"])

@router.get("/verify/{message_id}")
async def verify_cross_chain_message(
    message_id: str,
    user: UserProfile = Depends(get_current_user)
):
    """Verify the delivery status of a cross-chain message."""
    if message_id not in db.messages:
        raise HTTPException(status_code=404, detail="Message not found")
    
    message = db.messages[message_id]
    if message.sender_address != user.wallet_address:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    if message.origin_chain == message.destination_chain:
        return {"status": "same_chain", "delivery_confirmed": True}
    
    if not message.bridge_tx_hash:
        return {
            "status": "failed",
            "error": "No bridge transaction hash found"
        }
    
    delivered = await bridge_service.verify_message_delivery(
        message,
        message.bridge_tx_hash
    )
    
    if delivered:
        message.cross_chain_status = CrossChainStatus.CONFIRMED
        message.delivery_confirmed = True
        message.status = MessageStatus.DELIVERED
    
    db.messages[message.id] = message
    
    return {
        "status": message.cross_chain_status,
        "delivery_confirmed": message.delivery_confirmed,
        "bridge_tx_hash": message.bridge_tx_hash
    }

@router.get("/estimate-fee")
async def estimate_bridge_fee(
    origin_chain: ChainType,
    destination_chain: ChainType,
    user: UserProfile = Depends(get_current_user)
):
    """Estimate the fee for sending a message between chains."""
    if origin_chain == destination_chain:
        return {"fee": 0}
    
    try:
        fee = await bridge_service.estimate_bridge_fee(
            origin_chain,
            destination_chain
        )
        return {"fee": fee}
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Failed to estimate fee: {str(e)}"
        )

@router.get("/pending")
async def get_pending_cross_chain_messages(
    user: UserProfile = Depends(get_current_user)
) -> List[Message]:
    """Get all pending cross-chain messages for the user."""
    return [
        msg for msg in db.messages.values()
        if msg.sender_address == user.wallet_address
        and msg.origin_chain != msg.destination_chain
        and msg.cross_chain_status in [
            CrossChainStatus.PENDING,
            CrossChainStatus.BRIDGING
        ]
    ]
