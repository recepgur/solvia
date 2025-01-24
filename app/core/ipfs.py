from aioipfs import AsyncIPFS
from typing import Optional
import json

class IPFSManager:
    def __init__(self):
        self.client = AsyncIPFS()
    
    async def upload_file(self, file_data: bytes) -> Optional[str]:
        """Upload a file to IPFS"""
        try:
            result = await self.client.add(file_data)
            return result['Hash']
        except Exception as e:
            print(f"IPFS upload error: {e}")
            return None
    
    async def upload_message(self, encrypted_message: str) -> Optional[str]:
        """Upload an encrypted message to IPFS"""
        try:
            message_bytes = encrypted_message.encode()
            result = await self.client.add(message_bytes)
            return result['Hash']
        except Exception as e:
            print(f"IPFS message upload error: {e}")
            return None
    
    async def get_message(self, ipfs_hash: str) -> Optional[str]:
        """Get a message from IPFS"""
        try:
            async for content in self.client.cat(ipfs_hash):
                return content.decode()
        except Exception as e:
            print(f"IPFS message retrieval error: {e}")
            return None
