"""Tests for blockchain node implementations."""
import pytest
import nacl.signing
import tempfile
import shutil
from pathlib import Path
from solvio.blockchain.nodes import MessageRoutingNode, StorageNode, ValidatorNode
from solvio.blockchain.models import (
    Block,
    BlockHeader,
    BlockType,
    MessageTransaction,
    MessageType,
    MessageMetadata
)

@pytest.mark.asyncio
async def test_message_routing_node():
    """Test MessageRoutingNode functionality."""
    # Create node
    node_id = b'test_node_1'
    mrn = MessageRoutingNode(node_id)
    mrn._test_mode = True
    
    # Create a test message transaction
    sender_key = nacl.signing.SigningKey.generate()
    recipient_key = nacl.signing.SigningKey.generate()
    message_tx = MessageTransaction.create(
        sender_key=sender_key,
        recipient_pubkey=bytes(recipient_key.verify_key),
        message_hash=b'test_message',
        message_type=MessageType.TEXT,
        size=100,
        ttl=3600
    )
    
    # Create a block with the message
    header = BlockHeader(
        previous_hash=b'prev_hash',
        timestamp=1234567890.0,
        merkle_root=b'merkle_root',
        difficulty=1,
        nonce=0,
        block_type=BlockType.MESSAGE
    )
    block = Block(
        header=header,
        transactions=[message_tx],
        validator_signatures=[b'validator_sig']
    )
    
    # Process block and verify routing table update
    await mrn.process_block(block)
    assert mrn.routing_table[message_tx.sender] == node_id
    assert message_tx.message_hash in mrn.message_cache
    
    # Test routing functionality
    peer_node_id = b'test_node_2'
    peer_node = MessageRoutingNode(peer_node_id)
    peer_node._test_mode = True
    await mrn.add_peer(peer_node_id, peer_node)
    
    # Update routing for recipient
    await mrn.update_routing(message_tx.recipient, peer_node_id)
    assert mrn.routing_table[message_tx.recipient] == peer_node_id
    
    # Test message routing
    success = await mrn.route_message(message_tx)
    assert success
    assert message_tx.message_hash in mrn.message_cache
    
    # Test message integrity
    stored_msg = mrn.message_cache[message_tx.message_hash]
    assert stored_msg.sender == message_tx.sender
    assert stored_msg.recipient == message_tx.recipient
    assert stored_msg.message_hash == message_tx.message_hash
    
    # Verify signature
    verify_key = nacl.signing.VerifyKey(message_tx.sender)
    verify_key.verify(message_tx.to_bytes(), message_tx.signature)
    
    # Test message caching limits
    for i in range(100):
        new_tx = MessageTransaction.create(
            sender_key=sender_key,
            recipient_pubkey=bytes(recipient_key.verify_key),
            message_hash=f"test_message_{i}".encode(),
            message_type=MessageType.TEXT,
            size=100,
            ttl=3600
        )
        await mrn.route_message(new_tx)
    
    # Verify cache size management
    assert len(mrn.message_cache) <= 1000  # Default cache size limit

@pytest.mark.asyncio
async def test_storage_node():
    """Test StorageNode functionality."""
    # Create temporary directory for test data
    test_dir = Path(tempfile.mkdtemp())
    try:
        # Create node
        node_id = b'test_storage_node'
        sn = StorageNode(node_id, test_dir)
        sn._test_mode = True
        await sn.start()
        
        # Create test message transaction
        sender_key = nacl.signing.SigningKey.generate()
        recipient_key = nacl.signing.SigningKey.generate()
        message_tx = MessageTransaction.create(
            sender_key=sender_key,
            recipient_pubkey=bytes(recipient_key.verify_key),
            message_hash=b'test_storage_message',
            message_type=MessageType.TEXT,
            size=100,
            ttl=3600
        )
        
        # Create and process block
        header = BlockHeader(
            previous_hash=b'prev_hash',
            timestamp=1234567890.0,
            merkle_root=b'merkle_root',
            difficulty=1,
            nonce=0,
            block_type=BlockType.MESSAGE
        )
        block = Block(
            header=header,
            transactions=[message_tx],
            validator_signatures=[b'validator_sig']
        )
        
        await sn.process_block(block)
        
        # Test message retrieval
        stored_message = await sn.get_message(message_tx.message_hash)
        assert stored_message is not None
        assert stored_message.sender == message_tx.sender
        assert stored_message.recipient == message_tx.recipient
        assert stored_message.message_hash == message_tx.message_hash
        
        # Test user identity management
        test_pubkey = bytes(sender_key.verify_key)
        await sn.update_user_identity(
            test_pubkey,
            "test_user",
            ["messaging", "voice"]
        )
        
        identity = await sn.get_user_identity(test_pubkey)
        assert identity is not None
        username, last_seen, capabilities = identity
        assert username == "test_user"
        assert "messaging" in capabilities
        assert "voice" in capabilities
        
        # Test shard distribution
        shard_id = sn._get_shard_id(message_tx.message_hash)
        assert 0 <= shard_id < sn.shard_count
        
        # Verify message is in correct shard
        conn = sn.shards[shard_id]
        cursor = conn.execute(
            "SELECT * FROM messages WHERE message_hash = ?",
            (message_tx.message_hash,)
        )
        row = cursor.fetchone()
        assert row is not None
        
        await sn.stop()
    finally:
        # Cleanup
        shutil.rmtree(test_dir)

@pytest.mark.asyncio
async def test_validator_node():
    """Test ValidatorNode functionality."""
    # Create validator node
    node_id = b'test_validator'
    stake_amount = 1000
    vn = ValidatorNode(node_id, stake_amount)
    vn._test_mode = True
    await vn.start()
    
    try:
        # Create test message transaction
        sender_key = nacl.signing.SigningKey.generate()
        recipient_key = nacl.signing.SigningKey.generate()
        message_tx = MessageTransaction.create(
            sender_key=sender_key,
            recipient_pubkey=bytes(recipient_key.verify_key),
            message_hash=b'test_validator_message',
            message_type=MessageType.TEXT,
            size=100,
            ttl=3600
        )
        
        # Test block validation and processing
        header = BlockHeader(
            previous_hash=b'0' * 64,  # Genesis block
            timestamp=1234567890.0,
            merkle_root=b'merkle_root',
            difficulty=1,
            nonce=0,
            block_type=BlockType.MESSAGE
        )
        block = Block(
            header=header,
            transactions=[message_tx],
            validator_signatures=[b'validator_sig']
        )
        
        # Process block
        await vn.process_block(block)
        
        # Verify block was added to blockchain state
        assert block.hash() in vn.blockchain_state
        
        # Test network metrics
        assert vn.network_metrics['block_time'] > 0
        assert vn.network_metrics['peer_count'] == 0  # No peers added yet
        
        # Test block production
        vn.is_leader = True
        vn.pending_transactions.append(message_tx)
        await vn._produce_block()
        
        # Verify pending transactions were processed
        assert len(vn.pending_transactions) == 0
        assert len(vn.blockchain_state) == 2  # Genesis + produced block
        
        # Test transaction validation
        assert await vn._validate_transaction(message_tx)
        
        # Test invalid transaction
        invalid_tx = MessageTransaction(
            sender=b'invalid',
            recipient=b'invalid',
            message_hash=b'invalid',
            timestamp=0.0,
            signature=b'invalid',
            metadata=MessageMetadata(
                message_type=MessageType.TEXT,
                size=0,
                ttl=0
            )
        )
        assert not await vn._validate_transaction(invalid_tx)
        
    finally:
        # Cleanup validator resources
        await vn.stop()
        vn.blockchain_state.clear()
        vn.pending_transactions.clear()
