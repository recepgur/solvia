"""Core blockchain models for the Solvio communication platform."""
from dataclasses import dataclass
from enum import Enum
from typing import List
import time
import nacl.signing
import nacl.hash

class BlockType(Enum):
    """Types of blocks in the Solvio blockchain."""
    MESSAGE = "message"      # Contains message hashes and routing info
    IDENTITY = "identity"    # Contains user identity updates
    STATE = "state"         # Contains network state updates
    CONSENSUS = "consensus" # Contains validator set changes

class MessageType(str, Enum):
    """Types of messages that can be transmitted."""
    TEXT = "text"
    VOICE = "voice"
    VIDEO = "video"
    FILE = "file"
    
    def __str__(self):
        return self.value

@dataclass
class BlockHeader:
    """Header of a block in the Solvio blockchain."""
    previous_hash: bytes
    timestamp: float
    merkle_root: bytes
    difficulty: int
    nonce: int
    block_type: BlockType

@dataclass
class MessageMetadata:
    """Metadata for message transactions."""
    message_type: MessageType
    size: int
    ttl: int

@dataclass
class MessageTransaction:
    """Transaction for storing message hashes and routing info."""
    sender: bytes  # Public key
    recipient: bytes  # Public key
    message_hash: bytes
    timestamp: float
    signature: bytes
    metadata: MessageMetadata
    
    def __lt__(self, other):
        """Compare transactions for priority queue ordering."""
        if not isinstance(other, MessageTransaction):
            return NotImplemented
        # Compare by timestamp for stable ordering
        return self.timestamp < other.timestamp

    @classmethod
    def create(cls, sender_key: nacl.signing.SigningKey, 
              recipient_pubkey: bytes, message_hash: bytes, 
              message_type: MessageType, size: int, ttl: int) -> 'MessageTransaction':
        """Create and sign a new message transaction."""
        metadata = MessageMetadata(message_type, size, ttl)
        timestamp = time.time()
        
        # Create transaction without signature first
        unsigned = cls(
            sender=bytes(sender_key.verify_key),
            recipient=recipient_pubkey,
            message_hash=message_hash,
            timestamp=timestamp,
            signature=b'',  # Placeholder
            metadata=metadata
        )
        
        # Sign the transaction
        message = unsigned.to_bytes()
        signature = sender_key.sign(message).signature
        
        return cls(
            sender=bytes(sender_key.verify_key),
            recipient=recipient_pubkey,
            message_hash=message_hash,
            timestamp=timestamp,
            signature=signature,
            metadata=metadata
        )
    
    def to_bytes(self) -> bytes:
        """Convert transaction to bytes for signing."""
        return b''.join([
            self.sender,
            self.recipient,
            self.message_hash,
            str(self.timestamp).encode(),
            self.metadata.message_type.name.encode(),  # Use enum name instead of value
            str(self.metadata.size).encode(),
            str(self.metadata.ttl).encode()
        ])

@dataclass
class Block:
    """Block in the Solvio blockchain."""
    header: BlockHeader
    transactions: List[MessageTransaction]
    validator_signatures: List[bytes]

    def hash(self) -> bytes:
        """Calculate the hash of the block using BLAKE2b.
        
        BLAKE2b is chosen over SHA256 for its:
        - Better performance
        - Higher security margin
        - Native support in PyNaCl
        - Resistance to length extension attacks
        """
        return nacl.hash.blake2b(self.to_bytes())
    
    def to_bytes(self) -> bytes:
        """Convert block to bytes for hashing."""
        header_bytes = b''.join([
            self.header.previous_hash,
            str(self.header.timestamp).encode(),
            self.header.merkle_root,
            str(self.header.difficulty).encode(),
            str(self.header.nonce).encode(),
            str(self.header.block_type.value).encode()
        ])
        
        tx_bytes = b''.join([tx.to_bytes() for tx in self.transactions])
        sig_bytes = b''.join(self.validator_signatures)
        
        return header_bytes + tx_bytes + sig_bytes
