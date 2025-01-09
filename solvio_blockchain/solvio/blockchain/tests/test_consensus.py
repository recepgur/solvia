"""Tests for DPoS consensus implementation."""
import pytest
import nacl.signing
import time
from solvio.blockchain.consensus import ConsensusManager, ValidatorInfo
from solvio.blockchain.nodes import ValidatorNode
from solvio.blockchain.models import MessageTransaction, MessageType, MessageMetadata

@pytest.mark.asyncio
async def test_validator_registration():
    """Test validator registration and active set management."""
    consensus = ConsensusManager()
    
    # Create validators
    validators = []
    for i in range(5):
        node_id = f"validator_{i}".encode()
        stake = 1000 * (i + 1)
        node = ValidatorNode(node_id, stake)
        validators.append((node, stake))
        success = await consensus.register_validator(node, stake)
        assert success
        
    # Verify active set
    assert len(consensus.active_set) == 5
    
    # Verify ordering by stake
    stakes = [consensus.validators[vid].stake for vid in consensus.active_set]
    assert stakes == sorted(stakes, reverse=True)
    
    # Test minimum stake requirement
    low_stake_node = ValidatorNode(b"low_stake", 500)
    success = await consensus.register_validator(low_stake_node, 500)
    assert not success

@pytest.mark.asyncio
async def test_transaction_prioritization():
    """Test transaction priority queue management."""
    consensus = ConsensusManager()
    
    # Create test transactions
    sender_key = nacl.signing.SigningKey.generate()
    recipient_key = nacl.signing.SigningKey.generate()
    
    # Voice call (high priority)
    voice_tx = MessageTransaction.create(
        sender_key=sender_key,
        recipient_pubkey=bytes(recipient_key.verify_key),
        message_hash=b"voice_hash",
        message_type=MessageType.VOICE,
        size=100_000,
        ttl=1800
    )
    
    # Text message (medium priority)
    text_tx = MessageTransaction.create(
        sender_key=sender_key,
        recipient_pubkey=bytes(recipient_key.verify_key),
        message_hash=b"text_hash",
        message_type=MessageType.TEXT,
        size=1000,
        ttl=3600
    )
    
    # Submit transactions
    await consensus.submit_transaction(text_tx)
    await consensus.submit_transaction(voice_tx)
    
    # Get prioritized transactions
    transactions = consensus._get_prioritized_transactions()
    
    # Verify voice call has higher priority
    assert len(transactions) == 2
    assert transactions[0].metadata.message_type == MessageType.VOICE
    
@pytest.mark.asyncio
async def test_validator_slashing():
    """Test validator slashing mechanism."""
    consensus = ConsensusManager()
    
    # Register validator
    node_id = b"test_validator"
    stake = 5000
    node = ValidatorNode(node_id, stake)
    await consensus.register_validator(node, stake)
    
    # Simulate consecutive misses
    validator_info = consensus.validators[node_id]
    validator_info.consecutive_misses = 10
    
    # Trigger slash check
    await consensus._manage_validator_set()
    
    # Verify validator was slashed
    assert validator_info.is_slashed
    assert validator_info.stake == 0
    assert node_id not in consensus.active_set
    
@pytest.mark.asyncio
async def test_validator_rotation():
    """Test validator set rotation."""
    consensus = ConsensusManager()
    consensus.rotation_interval = 1  # Set to 1 second for testing
    
    # Register validators
    for i in range(3):
        node_id = f"validator_{i}".encode()
        stake = 1000 * (i + 1)
        node = ValidatorNode(node_id, stake)
        await consensus.register_validator(node, stake)
    
    # Record initial active set
    initial_set = consensus.active_set.copy()
    
    # Wait for rotation
    consensus.last_rotation_time = 0
    await consensus._manage_validator_set()
    
    # Verify rotation occurred
    assert consensus.last_rotation_time > 0
    # Active set order should be same (based on stake)
    assert consensus.active_set == initial_set
    
    # Verify all validators have reset consecutive misses
    for info in consensus.validators.values():
        assert info.consecutive_misses == 0
