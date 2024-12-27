from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime

class GroupMember(BaseModel):
    wallet_address: str
    joined_at: datetime
    role: str = "member"  # admin, member
    nft_proof: Optional[str] = None  # Proof of NFT ownership

class GroupMessage(BaseModel):
    id: str
    sender: str
    content: str
    timestamp: datetime
    reply_to: Optional[str] = None
    media_url: Optional[str] = None
    media_type: Optional[str] = None

class Group(BaseModel):
    id: str
    name: str
    created_at: datetime
    created_by: str
    required_nft: Optional[str] = None  # NFT contract address required for joining
    members: List[GroupMember]
    description: Optional[str] = None
    avatar_url: Optional[str] = None
    messages: List[GroupMessage] = []
    
    def is_member(self, wallet_address: str) -> bool:
        return any(member.wallet_address == wallet_address for member in self.members)
    
    def is_admin(self, wallet_address: str) -> bool:
        return any(
            member.wallet_address == wallet_address and member.role == "admin" 
            for member in self.members
        )
    
    def add_member(self, wallet_address: str, nft_proof: Optional[str] = None) -> None:
        if not self.is_member(wallet_address):
            self.members.append(
                GroupMember(
                    wallet_address=wallet_address,
                    joined_at=datetime.utcnow(),
                    nft_proof=nft_proof
                )
            )
    
    def remove_member(self, wallet_address: str) -> bool:
        initial_length = len(self.members)
        self.members = [m for m in self.members if m.wallet_address != wallet_address]
        return len(self.members) < initial_length
    
    def add_message(self, message: GroupMessage) -> None:
        if self.is_member(message.sender):
            self.messages.append(message)
