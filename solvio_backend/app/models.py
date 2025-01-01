from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict
from datetime import datetime
from enum import Enum

class MessageType(str, Enum):
    TEXT = "text"
    VOICE = "voice"
    CALL = "call"

class MessageStatus(str, Enum):
    PENDING = "pending"
    SENT = "sent"
    DELIVERED = "delivered"
    READ = "read"

class Message(BaseModel):
    model_config = ConfigDict(json_encoders={datetime: lambda dt: dt.isoformat()})
    
    id: str
    sender_address: str
    recipient_address: str
    content: str
    message_type: MessageType = MessageType.TEXT
    media_url: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    status: MessageStatus = MessageStatus.SENT
    encrypted: bool = True
    offline: bool = False
    retry_count: int = 0
    last_retry: Optional[datetime] = None

class Contact(BaseModel):
    model_config = ConfigDict(json_encoders={datetime: lambda dt: dt.isoformat()})
    
    wallet_address: str
    display_name: Optional[str] = None
    last_seen: Optional[datetime] = None

class UserProfile(BaseModel):
    wallet_address: str
    display_name: Optional[str] = None
    status: Optional[str] = None
    contacts: List[Contact] = []
    has_nft_access: bool = False
    nft_mint_address: Optional[str] = None
    nft_verified_at: Optional[datetime] = None

# In-memory database
class CallSignalType(str, Enum):
    OFFER = "offer"
    ANSWER = "answer"
    ICE_CANDIDATE = "ice-candidate"
    HANGUP = "hangup"

class CallState(BaseModel):
    model_config = ConfigDict(json_encoders={datetime: lambda dt: dt.isoformat()})
    
    call_id: str
    caller_address: str
    callee_address: str
    start_time: datetime = Field(default_factory=datetime.utcnow)
    status: str = "ringing"  # ringing, connected, ended

class CallSignal(BaseModel):
    model_config = ConfigDict(json_encoders={datetime: lambda dt: dt.isoformat()})
    
    call_id: str
    signal_type: CallSignalType
    sender_address: str
    recipient_address: str
    data: dict
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class ICECandidate(BaseModel):
    model_config = ConfigDict(json_encoders={datetime: lambda dt: dt.isoformat()})
    
    call_id: str
    sender_address: str
    candidate: dict
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class Database:
    def __init__(self):
        self.messages: Dict[str, Message] = {}
        self.users: Dict[str, UserProfile] = {}
        self.contacts: Dict[str, List[Contact]] = {}
        self.calls: Dict[str, CallState] = {}
        self.call_signals: Dict[str, List[CallSignal]] = {}
        self.ice_candidates: Dict[str, List[ICECandidate]] = {}

# Global in-memory database instance
db = Database()
