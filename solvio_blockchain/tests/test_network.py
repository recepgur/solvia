"""Integration tests for the complete Solvio blockchain network."""
import pytest
import asyncio
import tempfile
from pathlib import Path
import nacl.signing
from solvio.blockchain.nodes import MessageRoutingNode, StorageNode, ValidatorNode
from solvio.blockchain.consensus import ConsensusManager
from solvio.blockchain.models import (
    Block,
    BlockHeader,
    BlockType,
    MessageTransaction,
    MessageType,
    MessageMetadata
)

@pytest.mark.asyncio
async def test_network_message_flow():
    """Test end-to-end message flow through the network."""
    # Set up network components
    consensus = ConsensusManager(target_block_time=0.5)
    
    # Create nodes
    mrn1 = MessageRoutingNode(b"mrn_1")
    mrn2 = MessageRoutingNode(b"mrn_2")
    
    storage_dir = Path(tempfile.mkdtemp())
    sn = StorageNode(b"storage_1", storage_dir)
    
    validators = []
    for i in range(3):
        node_id = f"validator_{i}".encode()
        stake = 1000 * (i + 1)
        validator = ValidatorNode(node_id, stake)
        validators.append(validator)
        await consensus.register_validator(validator, stake)
    
    try:
        # Start all nodes
        await mrn1.start()
        await mrn2.start()
        await sn.start()
        for validator in validators:
            await validator.start()
        await consensus.start()
        
        # Set up peer connections
        await mrn1.add_peer(mrn2.node_id, mrn2)
        await mrn2.add_peer(mrn1.node_id, mrn1)
        
        # Create test message
        sender_key = nacl.signing.SigningKey.generate()
        recipient_key = nacl.signing.SigningKey.generate()
        
        message_tx = MessageTransaction.create(
            sender_key=sender_key,
            recipient_pubkey=bytes(recipient_key.verify_key),
            message_hash=b"test_network_message",
            message_type=MessageType.TEXT,
            size=100,
            ttl=3600
        )
        
        # Submit message to consensus
        await consensus.submit_transaction(message_tx)
        
        # Update routing tables
        await mrn1.update_routing(message_tx.sender, mrn1.node_id)
        await mrn2.update_routing(message_tx.recipient, mrn2.node_id)
        
        # Wait for message propagation
        await asyncio.sleep(2.0)  # Allow for multiple block cycles
        
        # Verify message reached recipient's routing node
        assert message_tx.message_hash in mrn2.message_cache
        
        # Verify message was stored
        stored_message = await sn.get_message(message_tx.message_hash)
        assert stored_message is not None
        assert stored_message.sender == message_tx.sender
        assert stored_message.recipient == message_tx.recipient
        
    finally:
        # Cleanup
        await mrn1.stop()
        await mrn2.stop()
        await sn.stop()
        for validator in validators:
            await validator.stop()
        await consensus.stop()
        
@pytest.mark.asyncio
async def test_validator_consensus():
    """Test validator consensus and block production."""
    consensus = ConsensusManager(target_block_time=0.5)
    
    # Create validators
    validators = []
    for i in range(5):
        node_id = f"validator_{i}".encode()
        stake = 1000 * (i + 1)
        validator = ValidatorNode(node_id, stake)
        validators.append(validator)
        await consensus.register_validator(validator, stake)
    
    try:
        # Start consensus and validators
        await consensus.start()
        for validator in validators:
            await validator.start()
            
        # Create test transactions
        transactions = []
        sender_key = nacl.signing.SigningKey.generate()
        recipient_key = nacl.signing.SigningKey.generate()
        
        for i in range(10):
            tx = MessageTransaction.create(
                sender_key=sender_key,
                recipient_pubkey=bytes(recipient_key.verify_key),
                message_hash=f"test_message_{i}".encode(),
                message_type=MessageType.TEXT,
                size=100,
                ttl=3600
            )
            transactions.append(tx)
            await consensus.submit_transaction(tx)
            
        # Wait for block production
        await asyncio.sleep(3.0)  # Allow for multiple block cycles
        
        # Verify blocks were produced
        for validator in validators:
            assert len(validator.blockchain_state) > 0
            
        # Verify transaction inclusion
        included_txs = set()
        for validator in validators:
            for block_hash, block in validator.blockchain_state.items():
                for tx in block.transactions:
                    included_txs.add(tx.message_hash)
                    
        # Verify all transactions were included
        for tx in transactions:
            assert tx.message_hash in included_txs
            
    finally:
        # Cleanup
        for validator in validators:
            await validator.stop()
        await consensus.stop()
        
@pytest.mark.asyncio
async def test_network_identity_management():
    """Test user identity management across the network."""
    # Set up storage node
    storage_dir = Path(tempfile.mkdtemp())
    sn = StorageNode(b"storage_1", storage_dir)
    await sn.start()
    
    try:
        # Create test user
        user_key = nacl.signing.SigningKey.generate()
        test_pubkey = bytes(user_key.verify_key)
        
        # Update user identity
        await sn.update_user_identity(
            test_pubkey,
            "test_user",
            ["messaging", "voice", "video"]
        )
        
        # Verify identity retrieval
        identity = await sn.get_user_identity(test_pubkey)
        assert identity is not None
        username, last_seen, capabilities = identity
        
        assert username == "test_user"
        assert "messaging" in capabilities
        assert "voice" in capabilities
        assert "video" in capabilities
        
        # Update capabilities
        await sn.update_user_identity(
            test_pubkey,
            "test_user",
            ["messaging"]  # Remove voice and video capabilities
        )
        
        # Verify update
        identity = await sn.get_user_identity(test_pubkey)
        assert identity is not None
        username, last_seen, capabilities = identity
        
        assert "messaging" in capabilities
        assert "voice" not in capabilities
        assert "video" not in capabilities
        
    finally:
        # Cleanup
        await sn.stop()
