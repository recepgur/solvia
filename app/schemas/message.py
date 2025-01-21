from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum

class MediaType(str, Enum):
    IMAGE = "image"
    VIDEO = "video"
    AUDIO = "audio"
    DOCUMENT = "document"

class MessageBase(BaseModel):
    content: str = Field(..., description="Message content (encrypted if is_encrypted=True)")
    receiver_id: str = Field(..., description="Receiver's Solana wallet address")
    is_encrypted: bool = Field(True, description="Whether the message is end-to-end encrypted")
    media_url: Optional[str] = Field(None, description="IPFS/Arweave URL for media content")
    media_type: Optional[MediaType] = Field(None, description="Type of media content")
    group_id: Optional[str] = Field(None, description="Group ID for group messages")

class MessageCreate(MessageBase):
    """Schema for creating a new message"""
    pass

class Message(MessageBase):
    """Schema for a complete message with metadata"""
    id: str = Field(..., description="Unique message identifier")
    sender_id: str = Field(..., description="Sender's Solana wallet address")
    timestamp: datetime = Field(..., description="Message timestamp")
    message_hash: Optional[str] = Field(None, description="IPFS content hash for the message")
    signature: Optional[str] = Field(None, description="Solana transaction signature")
    
    class Config:
        from_attributes = True
        json_schema_extra = {
            "example": {
                "id": "msg_123",
                "content": "encrypted_content_here",
                "sender_id": "sender_wallet_address",
                "receiver_id": "receiver_wallet_address",
                "timestamp": "2024-01-22T10:30:00Z",
                "is_encrypted": True,
                "message_hash": "Qm...",
                "signature": "transaction_signature",
                "media_url": None,
                "media_type": None,
                "group_id": None
            }
        }
