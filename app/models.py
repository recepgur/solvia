from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class NFTProfile(BaseModel):
    wallet_address: str
    nft_mint_address: str
    nft_metadata_uri: str
    verified: bool = False

class PrivateRoom(BaseModel):
    id: Optional[str] = None
    name: str
    required_nft_collection: str
    members: List[str]
    created_at: Optional[datetime] = None
    room_type: str = "voice"  # Can be "text" or "voice"
    max_participants: int = 50
    is_active: bool = True
    token_requirement: float = 0.1  # Required Solvio token balance
    state_hash: Optional[str] = None  # IPFS hash of room state

    def to_state_dict(self) -> dict:
        """Convert room to minimal state for IPFS storage"""
        return {
            "id": self.id,
            "members": self.members,
            "required_nft_collection": self.required_nft_collection,
            "token_requirement": self.token_requirement,
            "is_active": self.is_active
        }

class Message(BaseModel):
    id: str
    sender_address: str
    recipient_address: str
    content_hash: str  # IPFS hash of encrypted content
    timestamp: datetime
    signature: str
    room_id: Optional[str] = None  # For private room messages

class Call(BaseModel):
    id: str
    caller_address: str
    recipient_address: str
    start_time: datetime
    end_time: Optional[datetime] = None
    status: str  # "pending", "active", "ended"

class User(BaseModel):
    wallet_address: str
    username: Optional[str] = None
    public_key: str
    last_seen: datetime

class SignatureRequest(BaseModel):
    message: str
    wallet_address: str
