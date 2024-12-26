import json
from unittest.mock import AsyncMock, MagicMock
from .config import settings

class IPFSManager:
    def __init__(self):
        # For testing, use in-memory storage
        self.stored_messages = {}
        self.stored_states = {}
    
    async def store_message(self, encrypted_content: str) -> str:
        """Store encrypted message and return a mock IPFS hash"""
        try:
            mock_hash = f"Qm{hash(encrypted_content)}"
            self.stored_messages[mock_hash] = encrypted_content
            return mock_hash
        except Exception as e:
            raise Exception(f"IPFS storage error: {str(e)}")
    
    async def retrieve_message(self, content_hash: str) -> str:
        """Retrieve message using mock hash"""
        try:
            if content_hash not in self.stored_messages:
                raise Exception("Message not found")
            return self.stored_messages[content_hash]
        except Exception as e:
            raise Exception(f"IPFS retrieval error: {str(e)}")
    
    async def store_room_state(self, room_id: str, state_data: dict) -> str:
        """Store room state data with mock IPFS"""
        try:
            state_str = json.dumps(state_data)
            mock_hash = f"Qm{hash(state_str)}"
            self.stored_states[mock_hash] = state_data
            return mock_hash
        except Exception as e:
            raise Exception(f"IPFS room state storage error: {str(e)}")
    
    async def retrieve_room_state(self, state_hash: str) -> dict:
        """Retrieve room state data using mock hash"""
        try:
            if state_hash not in self.stored_states:
                raise Exception("Room state not found")
            return self.stored_states[state_hash]
        except Exception as e:
            raise Exception(f"IPFS room state retrieval error: {str(e)}")

# Initialize the mock IPFS manager
ipfs = IPFSManager()
