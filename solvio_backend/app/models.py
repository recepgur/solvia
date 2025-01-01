from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict
from datetime import datetime
from enum import Enum

class ChainType(str, Enum):
    SOLANA = "solana"
    ETHEREUM = "ethereum"
    POLYGON = "polygon"
    BSC = "bsc"

class MessageType(str, Enum):
    TEXT = "text"
    VOICE = "voice"
    CALL = "call"
    FILE = "file"

class GroupRole(str, Enum):
    ADMIN = "admin"
    MEMBER = "member"

class MessageStatus(str, Enum):
    PENDING = "pending"
    SENT = "sent"
    DELIVERED = "delivered"
    READ = "read"

class CrossChainStatus(str, Enum):
    PENDING = "pending"
    BRIDGING = "bridging"
    CONFIRMED = "confirmed"
    FAILED = "failed"

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
    
    # Cross-chain messaging fields
    origin_chain: ChainType
    destination_chain: ChainType
    cross_chain_status: CrossChainStatus = CrossChainStatus.PENDING
    bridge_tx_hash: Optional[str] = None
    delivery_confirmed: bool = False
    bridge_fee: Optional[float] = None

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
    groups: List[str] = []  # List of group IDs the user is a member of

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

class Group(BaseModel):
    model_config = ConfigDict(json_encoders={datetime: lambda dt: dt.isoformat()})
    
    id: str
    name: str
    creator_address: str
    members: Dict[str, GroupRole]
    encryption_key: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class GroupMessage(BaseModel):
    model_config = ConfigDict(json_encoders={datetime: lambda dt: dt.isoformat()})
    
    id: str
    group_id: str
    sender_address: str
    content: str
    message_type: MessageType = MessageType.TEXT
    media_url: Optional[str] = None
    status: MessageStatus = MessageStatus.PENDING
    encrypted_content: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class Database:
    def __init__(self):
        self.messages: Dict[str, Message] = {}
        self.users: Dict[str, UserProfile] = {}
        self.contacts: Dict[str, List[Contact]] = {}
        self.calls: Dict[str, CallState] = {}
        self.call_signals: Dict[str, List[CallSignal]] = {}
        self.ice_candidates: Dict[str, List[ICECandidate]] = {}
        self.groups: Dict[str, Group] = {}
        self.group_messages: Dict[str, GroupMessage] = {}

# Global in-memory database instance
db = Database()
