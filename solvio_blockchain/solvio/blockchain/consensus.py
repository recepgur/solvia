"""Delegated Proof of Stake consensus implementation for Solvio blockchain."""
from dataclasses import dataclass
from typing import List, Dict, Set, Optional
import asyncio
import time
import heapq
import nacl.signing
from .models import (
    Block,
    BlockHeader,
    BlockType,
    MessageTransaction,
    MessageType,
    MessageMetadata
)
from .nodes import ValidatorNode

@dataclass
class ValidatorInfo:
    """Information about a validator."""
    node: ValidatorNode
    stake: int
    last_block_time: float
    consecutive_misses: int
    is_slashed: bool

class ConsensusManager:
    """Manages DPoS consensus for the Solvio blockchain."""
    
    def __init__(self, target_block_time: float = 0.5):
        """Initialize consensus manager."""
        self.target_block_time = target_block_time
        self.validators: Dict[bytes, ValidatorInfo] = {}  # node_id -> info
        self.active_set: List[bytes] = []  # Ordered list of active validator IDs
        self.pending_transactions: List[tuple[float, MessageTransaction]] = []  # Priority queue
        self.last_rotation_time = 0.0
        self.rotation_interval = 24 * 60 * 60  # 24 hours in seconds
        self.max_active_validators = 100
        self.min_stake = 1000  # Minimum stake to become validator
        self.running = False
        
    async def start(self):
        """Start consensus management."""
        self.running = True
        while self.running:
            await self._manage_validator_set()
            await self._coordinate_block_production()
            await asyncio.sleep(0.1)
            
    async def stop(self):
        """Stop consensus management."""
        self.running = False
        
    async def register_validator(self, node: ValidatorNode, stake: int) -> bool:
        """Register a new validator with stake."""
        if stake < self.min_stake:
            return False
            
        self.validators[node.node_id] = ValidatorInfo(
            node=node,
            stake=stake,
            last_block_time=0.0,
            consecutive_misses=0,
            is_slashed=False
        )
        
        await self._update_active_set()
        return True
        
    async def submit_transaction(self, tx: MessageTransaction):
        """Submit a transaction to the pending pool with priority."""
        # Compute priority based on transaction type and stake
        priority = self._compute_transaction_priority(tx)
        heapq.heappush(self.pending_transactions, (-priority, tx))
        
    async def _manage_validator_set(self):
        """Manage validator set rotation and slashing."""
        current_time = time.time()
        
        # Check if rotation is needed
        if current_time - self.last_rotation_time >= self.rotation_interval:
            await self._rotate_validator_set()
            self.last_rotation_time = current_time
            
        # Check for validator misbehavior
        slashed_validators = []
        for validator_id, info in self.validators.items():
            if info.consecutive_misses >= 10 and not info.is_slashed:  # Threshold for slashing
                slashed_validators.append(validator_id)
                
        # Slash validators after iteration to avoid dict modification during iteration
        for validator_id in slashed_validators:
            await self._slash_validator(validator_id)
                
    async def _rotate_validator_set(self):
        """Rotate the active validator set."""
        # Sort validators by stake
        sorted_validators = sorted(
            [(v.stake, k) for k, v in self.validators.items() if not v.is_slashed],
            reverse=True
        )
        
        # Select top validators
        self.active_set = [
            vid for _, vid in sorted_validators[:self.max_active_validators]
        ]
        
        # Reset validator states
        for info in self.validators.values():
            info.consecutive_misses = 0
            
    async def _slash_validator(self, validator_id: bytes):
        """Slash a validator for misbehavior."""
        if validator_id in self.validators:
            validator_info = self.validators[validator_id]
            if not validator_info.is_slashed:  # Only slash once
                validator_info.is_slashed = True
                validator_info.stake = 0
                validator_info.consecutive_misses = 0  # Reset after slashing
                validator_info.node.is_leader = False  # Remove leadership
                if validator_id in self.active_set:
                    self.active_set.remove(validator_id)
                    await self._update_active_set()
                
    async def _coordinate_block_production(self):
        """Coordinate block production among validators."""
        if not self.active_set:
            return
            
        current_time = time.time()
        
        # Determine current leader
        leader_index = int(current_time / self.target_block_time) % len(self.active_set)
        leader_id = self.active_set[leader_index]
        leader_info = self.validators[leader_id]
        
        # Check if it's time for new block
        if (current_time - leader_info.last_block_time) >= self.target_block_time:
            # Signal leader to produce block
            leader_info.node.is_leader = True
            
            # Get prioritized transactions
            transactions = self._get_prioritized_transactions()
            
            # Update leader's pending transactions
            leader_info.node.pending_transactions = transactions
            
            # Wait for block production
            try:
                await asyncio.wait_for(
                    self._wait_for_block(leader_info.node),
                    timeout=self.target_block_time
                )
                leader_info.consecutive_misses = 0
            except asyncio.TimeoutError:
                leader_info.consecutive_misses += 1
                
            leader_info.node.is_leader = False
            
    async def _wait_for_block(self, node: ValidatorNode) -> Optional[Block]:
        """Wait for a validator to produce a block."""
        # In production, would implement proper block waiting mechanism
        await asyncio.sleep(self.target_block_time / 2)
        return None
        
    def _compute_transaction_priority(self, tx: MessageTransaction) -> float:
        """Compute priority score for a transaction."""
        # Base priority by message type (higher priority for real-time communication)
        type_priority = {
            MessageType.VOICE: 10.0,  # Increased priority for real-time voice
            MessageType.VIDEO: 9.0,   # Increased priority for real-time video
            MessageType.TEXT: 5.0,    # Medium priority for text
            MessageType.FILE: 3.0     # Lower priority for files
        }.get(tx.metadata.message_type, 1.0)
        
        # Adjust by sender stake if sender is validator
        sender_info = next(
            (v for v in self.validators.values() 
             if v.node.node_id == tx.sender),
            None
        )
        stake_multiplier = 1.0 + (sender_info.stake / 10000.0 if sender_info else 0)
        
        # Factor in message size and TTL (normalized)
        size_factor = max(0.1, min(1.0, 1.0 - (tx.metadata.size / 1_000_000)))  # Favor smaller messages
        ttl_factor = max(0.1, min(1.0, tx.metadata.ttl / 3600))  # Normalize TTL impact
        
        # Combine factors with higher weight on type_priority
        return (type_priority * 2.0 + stake_multiplier + size_factor + ttl_factor) / 5.0
        
    def _get_prioritized_transactions(self) -> List[MessageTransaction]:
        """Get prioritized list of transactions for next block."""
        transactions = []
        total_size = 0
        max_block_size = 1_000_000  # 1MB limit
        
        # Create a copy of pending transactions to preserve original queue
        pending_copy = self.pending_transactions.copy()
        
        while pending_copy and total_size < max_block_size:
            priority, tx = heapq.heappop(pending_copy)
            if total_size + tx.metadata.size <= max_block_size:
                transactions.append(tx)
                total_size += tx.metadata.size
                
        return transactions
        
    async def _update_active_set(self):
        """Update the active validator set."""
        # Sort validators by stake
        sorted_validators = sorted(
            [(v.stake, k) for k, v in self.validators.items() if not v.is_slashed],
            reverse=True
        )
        
        # Update active set
        self.active_set = [
            vid for _, vid in sorted_validators[:self.max_active_validators]
        ]
        
        # Update validator states
        for validator_id in self.active_set:
            self.validators[validator_id].node.is_leader = False
