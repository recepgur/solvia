"""Integration tests for the complete Solvio blockchain network."""
import pytest
import asyncio
import tempfile
import time
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
    consensus._test_mode = True  # Enable test mode for consensus
    
    # Create nodes in test mode
    mrn1 = MessageRoutingNode(b"mrn_1")
    mrn2 = MessageRoutingNode(b"mrn_2")
    mrn1._test_mode = True
    mrn2._test_mode = True
    
    storage_dir = Path(tempfile.mkdtemp())
    sn = StorageNode(b"storage_1", storage_dir)
    sn._test_mode = True  # Enable test mode for storage node
    
    validators = []
    for i in range(3):
        node_id = f"validator_{i}".encode()
        stake = 1000 * (i + 1)
        validator = ValidatorNode(node_id, stake)
        validator._test_mode = True  # Enable test mode
        validators.append(validator)
        await consensus.register_validator(validator, stake)
    
    try:
        # Start all nodes with timeout
        async with asyncio.timeout(5.0):  # 5 second timeout for startup
            await mrn1.start()
            await mrn2.start()
            await sn.start()
            for validator in validators:
                await validator.start()
                # Connect storage node to validators
                await validator.add_peer(sn.node_id, sn)
                await sn.add_peer(validator.node_id, validator)
            await consensus.start()
        
        # Set up peer connections
        await mrn1.add_peer(mrn2.node_id, mrn2)
        await mrn2.add_peer(mrn1.node_id, mrn1)
        # Connect routing nodes to validators
        for validator in validators:
            await mrn1.add_peer(validator.node_id, validator)
            await mrn2.add_peer(validator.node_id, validator)
            await validator.add_peer(mrn1.node_id, mrn1)
            await validator.add_peer(mrn2.node_id, mrn2)
        
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
        
        # Submit message and wait for propagation with timeout
        async with asyncio.timeout(3.0):  # 3 second timeout for message propagation
            await consensus.submit_transaction(message_tx)
            await mrn1.update_routing(message_tx.sender, mrn1.node_id)
            await mrn2.update_routing(message_tx.recipient, mrn2.node_id)
            
            # Force block production in test mode
            await consensus._coordinate_block_production()
            
            # Wait for message propagation (with progress checks)
            start_time = time.time()
            while time.time() - start_time < 2.0:
                if message_tx.message_hash in mrn2.message_cache:
                    break
                # Check if message is in any validator's state
                for validator in validators:
                    for block in validator.blockchain_state.values():
                        if message_tx in block.transactions:
                            # Force message processing
                            await mrn2.process_block(block)
                            break
                await asyncio.sleep(0.1)
            
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
    consensus._test_mode = True  # Enable test mode for consensus
    
    # Create validators with test mode
    validators = []
    for i in range(5):
        node_id = f"validator_{i}".encode()
        stake = 1000 * (i + 1)
        validator = ValidatorNode(node_id, stake)
        validator._test_mode = True  # Enable test mode for validator
        validators.append(validator)
        success = await consensus.register_validator(validator, stake)
        assert success, f"Validator {i} registration should succeed"
    
    try:
        # Start consensus and validators with timeout
        async with asyncio.timeout(5.0):  # 5 second timeout for startup
            await consensus.start()
            for validator in validators:
                await validator.start()
                # Connect validators to each other
                for peer in validators:
                    if peer != validator:
                        await validator.add_peer(peer.node_id, peer)
                
        # Create test transactions
        transactions = []
        sender_key = nacl.signing.SigningKey.generate()
        recipient_key = nacl.signing.SigningKey.generate()
        
        # Submit transactions and verify block production with timeout
        async with asyncio.timeout(3.0):
            # Create and submit transactions
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
            
            # Force block production in test mode
            await consensus._coordinate_block_production()
            
            # Wait for block propagation with progress checks
            start_time = time.time()
            while time.time() - start_time < 2.0:
                # Check if all validators have processed blocks
                if all(len(v.blockchain_state) > 0 for v in validators):
                    # Check if all transactions are included
                    included_txs = set()
                    for validator in validators:
                        for block in validator.blockchain_state.values():
                            for tx in block.transactions:
                                included_txs.add(tx.message_hash)
                    if all(tx.message_hash in included_txs for tx in transactions):
                        break
                await asyncio.sleep(0.1)
            
            # Verify blocks were produced
            for i, validator in enumerate(validators):
                assert len(validator.blockchain_state) > 0, f"Validator {i} should have blocks"
            
            # Verify transaction inclusion
            included_txs = set()
            for validator in validators:
                for block_hash, block in validator.blockchain_state.items():
                    for tx in block.transactions:
                        included_txs.add(tx.message_hash)
            
            # Verify all transactions were included
            for tx in transactions:
                assert tx.message_hash in included_txs, f"Transaction {tx.message_hash} should be included"
            
            # Verify block consistency across validators
            first_validator_blocks = set(validators[0].blockchain_state.keys())
            for i, validator in enumerate(validators[1:], 1):
                validator_blocks = set(validator.blockchain_state.keys())
                assert validator_blocks == first_validator_blocks, f"Validator {i} has inconsistent blockchain state"
            
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
    sn._test_mode = True
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
