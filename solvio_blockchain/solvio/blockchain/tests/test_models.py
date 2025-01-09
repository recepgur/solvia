"""Tests for blockchain models."""
import pytest
import nacl.signing
from solvio.blockchain.models import (
    Block,
    BlockHeader,
    BlockType,
    MessageTransaction,
    MessageType,
    MessageMetadata
)

def test_message_transaction_creation():
    """Test creating and signing a message transaction."""
    # Create keypairs
    sender_key = nacl.signing.SigningKey.generate()
    recipient_key = nacl.signing.SigningKey.generate()
    
    # Create a message hash
    message_hash = b'test_message_hash'
    
    # Create transaction
    tx = MessageTransaction.create(
        sender_key=sender_key,
        recipient_pubkey=bytes(recipient_key.verify_key),
        message_hash=message_hash,
        message_type=MessageType.TEXT,
        size=100,
        ttl=3600
    )
    
    # Verify transaction
    assert tx.sender == bytes(sender_key.verify_key)
    assert tx.recipient == bytes(recipient_key.verify_key)
    assert tx.message_hash == message_hash
    assert tx.metadata.message_type == MessageType.TEXT
    assert tx.metadata.size == 100
    assert tx.metadata.ttl == 3600
    
    # Verify signature
    verify_key = nacl.signing.VerifyKey(tx.sender)
    verify_key.verify(tx.to_bytes(), tx.signature)

def test_block_creation():
    """Test creating and hashing a block."""
    # Create a sample transaction
    sender_key = nacl.signing.SigningKey.generate()
    recipient_key = nacl.signing.SigningKey.generate()
    tx = MessageTransaction.create(
        sender_key=sender_key,
        recipient_pubkey=bytes(recipient_key.verify_key),
        message_hash=b'test_message',
        message_type=MessageType.TEXT,
        size=100,
        ttl=3600
    )
    
    # Create block header
    header = BlockHeader(
        previous_hash=b'previous_hash',
        timestamp=1234567890.0,
        merkle_root=b'merkle_root',
        difficulty=1,
        nonce=0,
        block_type=BlockType.MESSAGE
    )
    
    # Create block
    block = Block(
        header=header,
        transactions=[tx],
        validator_signatures=[b'validator_signature']
    )
    
    # Verify block hash
    block_hash = block.hash()
    assert isinstance(block_hash, bytes)
    assert len(block_hash) == 64  # BLAKE2b hash size (512 bits)
