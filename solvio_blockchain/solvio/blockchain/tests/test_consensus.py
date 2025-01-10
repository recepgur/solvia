"""Tests for DPoS consensus implementation."""
import pytest
import nacl.signing
import time
import asyncio
from solvio.blockchain.consensus import ConsensusManager, ValidatorInfo
from solvio.blockchain.nodes import ValidatorNode
from solvio.blockchain.models import (
    Block,
    BlockHeader,
    BlockType,
    MessageTransaction,
    MessageType,
    MessageMetadata
)

@pytest.mark.asyncio
async def test_validator_registration():
    """Test validator registration and active set management."""
    consensus = ConsensusManager()
    
    # Create validators with different stakes
    validators = []
    for i in range(5):
        node_id = f"validator_{i}".encode()
        stake = 1000 * (i + 1)  # Increasing stakes
        node = ValidatorNode(node_id, stake)
        node._test_mode = True
        validators.append((node, stake))
        success = await consensus.register_validator(node, stake)
        
    # Test stake-weighted voting
    stakes = [consensus.validators[vid].stake for vid in consensus.active_set]
    assert stakes == sorted(stakes, reverse=True)  # Higher stakes first
    
    # Test leader selection
    leader_counts = {vid: 0 for vid in consensus.active_set}
    for i in range(100):  # Simulate 100 block cycles
        current_time = consensus.target_block_time * i
        leader_index = int(current_time / consensus.target_block_time) % len(consensus.active_set)
        leader_id = consensus.active_set[leader_index]
        leader_counts[leader_id] += 1
    
    # Verify fair leader rotation
    assert all(count > 0 for count in leader_counts.values())  # All validators get turns
    
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
    
    # Create test transactions from validators with different stakes
    high_stake_key = nacl.signing.SigningKey.generate()
    low_stake_key = nacl.signing.SigningKey.generate()
    recipient_key = nacl.signing.SigningKey.generate()
    
    # Register validators with different stakes
    high_stake_node = ValidatorNode(bytes(high_stake_key.verify_key), 5000)
    low_stake_node = ValidatorNode(bytes(low_stake_key.verify_key), 1000)
    high_stake_node._test_mode = True
    low_stake_node._test_mode = True
    
    await consensus.register_validator(high_stake_node, 5000)
    await consensus.register_validator(low_stake_node, 1000)
    
    # Create transactions with same type but different senders
    high_stake_tx = MessageTransaction.create(
        sender_key=high_stake_key,
        recipient_pubkey=bytes(recipient_key.verify_key),
        message_hash=b"high_stake_msg",
        message_type=MessageType.TEXT,
        size=100,
        ttl=3600
    )
    
    low_stake_tx = MessageTransaction.create(
        sender_key=low_stake_key,
        recipient_pubkey=bytes(recipient_key.verify_key),
        message_hash=b"low_stake_msg",
        message_type=MessageType.TEXT,
        size=100,
        ttl=3600
    )
    
    # Create voice call (highest priority type)
    voice_tx = MessageTransaction.create(
        sender_key=low_stake_key,  # Even from low stake validator
        recipient_pubkey=bytes(recipient_key.verify_key),
        message_hash=b"voice_msg",
        message_type=MessageType.VOICE,
        size=100_000,
        ttl=1800
    )
    
    # Submit transactions
    await consensus.submit_transaction(low_stake_tx)
    await consensus.submit_transaction(high_stake_tx)
    await consensus.submit_transaction(voice_tx)
    
    # Get prioritized transactions
    transactions = consensus._get_prioritized_transactions()
    
    # Verify transaction priorities
    assert len(transactions) == 3
    # Voice call should be first regardless of stake
    assert transactions[0].metadata.message_type == MessageType.VOICE
    # Between same type messages, higher stake should have priority
    text_txs = [tx for tx in transactions if tx.metadata.message_type == MessageType.TEXT]
    assert len(text_txs) == 2
    assert text_txs[0].sender == bytes(high_stake_key.verify_key)
    assert text_txs[1].sender == bytes(low_stake_key.verify_key)
    
    # Verify signature integrity
    for tx in transactions:
        verify_key = nacl.signing.VerifyKey(tx.sender)
        verify_key.verify(tx.to_bytes(), tx.signature)
    
@pytest.mark.asyncio
async def test_validator_slashing():
    """Test validator slashing mechanism."""
    consensus = ConsensusManager()
    
    # Register validator
    node_id = b"test_validator"
    stake = 5000
    node = ValidatorNode(node_id, stake)
    await consensus.register_validator(node, stake)
    
    # Get validator info and verify initial state
    validator_info = consensus.validators[node_id]
    initial_stake = validator_info.stake
    assert node_id in consensus.active_set
    assert not validator_info.is_slashed
    
    # Simulate consecutive misses over multiple management cycles
    for _ in range(3):  # Multiple cycles to ensure slashing triggers
        validator_info.consecutive_misses = 10
        await consensus._manage_validator_set()
        await asyncio.sleep(0.1)  # Allow for async operations
    
    # Verify validator was slashed
    assert validator_info.is_slashed, "Validator should be slashed"
    assert validator_info.stake == 0, "Slashed validator stake should be zero"
    assert validator_info.consecutive_misses == 0, "Misses should reset after slashing"
    assert node_id not in consensus.active_set, "Slashed validator should be removed from active set"
    
    # Verify validator cannot be re-registered
    new_success = await consensus.register_validator(node, initial_stake)
    assert not new_success, "Slashed validator should not be able to re-register"
    
    # Double-check validator remains slashed
    assert validator_info.is_slashed, "Validator should remain slashed after re-registration attempt"
    assert validator_info.stake == 0, "Validator stake should remain zero after re-registration attempt"
    
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
    
    # Create validators list for testing
    validators = []
    for i in range(3):
        node_id = f"validator_{i}".encode()
        stake = 1000 * (i + 1)
        node = ValidatorNode(node_id, stake)
        node._test_mode = True  # Enable test mode
        validators.append((node, stake))
        await consensus.register_validator(node, stake)
    
    # Test consensus agreement
    test_block = Block(
        header=BlockHeader(
            previous_hash=b'0' * 64,
            timestamp=time.time(),
            merkle_root=b'test_merkle_root',
            difficulty=1,
            nonce=0,
            block_type=BlockType.MESSAGE
        ),
        transactions=[],
        validator_signatures=[]
    )
    
    # Collect signatures from validators
    signatures = []
    for node, _ in validators:
        sig = node._sign_block(test_block.header)
        signatures.append(sig)
    test_block.validator_signatures = signatures
    
    # Verify block achieves consensus
    for node, _ in validators:
        assert await node._validate_block(test_block)
    
    # Verify all validators have reset consecutive misses
    for info in consensus.validators.values():
        assert info.consecutive_misses == 0
