from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from enum import Enum

class MediaType(str, Enum):
    IMAGE = "image"
    VIDEO = "video"
    AUDIO = "audio"
    DOCUMENT = "document"

class MessageBase(BaseModel):
    content: str
    receiver_id: str
    media_url: Optional[str] = None
    media_type: Optional[MediaType] = None
    group_id: Optional[str] = None

class MessageCreate(MessageBase):
    pass

class Message(MessageBase):
    id: str
    sender_id: str
    timestamp: datetime
    message_hash: Optional[str] = None
    signature: Optional[str] = None

    class Config:
        from_attributes = True
