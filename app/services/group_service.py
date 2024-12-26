import uuid
from datetime import datetime
from typing import List, Optional
from ..models.group import Group, GroupMessage, GroupMember
from ..blockchain import verify_nft_ownership
from ..storage import Storage

class GroupService:
    def __init__(self, storage: Storage):
        self.storage = storage
    
    async def create_group(
        self, 
        name: str, 
        created_by: str,
        required_nft: Optional[str] = None,
        description: Optional[str] = None,
        avatar_url: Optional[str] = None
    ) -> Group:
        """Create a new group chat"""
        if required_nft:
            # Verify creator owns the required NFT
            if not await verify_nft_ownership(created_by, required_nft):
                raise ValueError("Creator must own the required NFT")
        
        group = Group(
            id=str(uuid.uuid4()),
            name=name,
            created_at=datetime.utcnow(),
            created_by=created_by,
            required_nft=required_nft,
            description=description,
            avatar_url=avatar_url,
            members=[
                GroupMember(
                    wallet_address=created_by,
                    joined_at=datetime.utcnow(),
                    role="admin"
                )
            ]
        )
        
        await self.storage.save_group(group)
        return group
    
    async def join_group(self, group_id: str, wallet_address: str) -> Group:
        """Join an existing group chat"""
        group = await self.storage.get_group(group_id)
        if not group:
            raise ValueError("Group not found")
        
        if group.is_member(wallet_address):
            return group
        
        if group.required_nft:
            if not await verify_nft_ownership(wallet_address, group.required_nft):
                raise ValueError("Must own required NFT to join group")
        
        group.add_member(wallet_address)
        await self.storage.save_group(group)
        return group
    
    async def leave_group(self, group_id: str, wallet_address: str) -> bool:
        """Leave a group chat"""
        group = await self.storage.get_group(group_id)
        if not group:
            raise ValueError("Group not found")
        
        if group.remove_member(wallet_address):
            await self.storage.save_group(group)
            return True
        return False
    
    async def send_message(
        self,
        group_id: str,
        sender: str,
        content: str,
        reply_to: Optional[str] = None,
        media_url: Optional[str] = None,
        media_type: Optional[str] = None
    ) -> GroupMessage:
        """Send a message to a group"""
        group = await self.storage.get_group(group_id)
        if not group:
            raise ValueError("Group not found")
        
        if not group.is_member(sender):
            raise ValueError("Must be a group member to send messages")
        
        message = GroupMessage(
            id=str(uuid.uuid4()),
            sender=sender,
            content=content,
            timestamp=datetime.utcnow(),
            reply_to=reply_to,
            media_url=media_url,
            media_type=media_type
        )
        
        group.add_message(message)
        await self.storage.save_group(group)
        return message
    
    async def get_user_groups(self, wallet_address: str) -> List[Group]:
        """Get all groups a user is a member of"""
        return await self.storage.get_user_groups(wallet_address)
