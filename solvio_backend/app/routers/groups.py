from fastapi import APIRouter, Depends, HTTPException
from typing import List, Optional
import uuid
from datetime import datetime
from ..models import Group, GroupMessage, GroupRole, UserProfile, MessageType, MessageStatus
from ..services.encryption_service import encryption_service
from ..main import get_current_user, db

router = APIRouter(prefix="/groups", tags=["groups"])

@router.post("/create")
async def create_group(
    name: str,
    member_addresses: List[str],
    user: UserProfile = Depends(get_current_user)
):
    """Create a new group chat."""
    group = Group(
        id=str(uuid.uuid4()),
        name=name,
        creator_address=user.wallet_address,
        members={
            user.wallet_address: GroupRole.ADMIN,
            **{addr: GroupRole.MEMBER for addr in member_addresses if addr != user.wallet_address}
        }
    )
    
    # Generate and store encryption key
    group.encryption_key = encryption_service.generate_group_key()
    encryption_service.add_group_key(group.id, group.encryption_key)
    
    # Store group
    db.groups[group.id] = group
    
    # Add group to members' profiles and send initial message
    welcome_message = GroupMessage(
        id=str(uuid.uuid4()),
        group_id=group.id,
        sender_address=user.wallet_address,
        content=f"Group '{name}' created",
        message_type=MessageType.TEXT,
        status=MessageStatus.SENT,
        timestamp=datetime.utcnow()
    )
    db.group_messages[welcome_message.id] = welcome_message
    
    # Add group to members' profiles
    for addr in [user.wallet_address] + member_addresses:
        if addr in db.users:
            if not hasattr(db.users[addr], 'groups'):
                db.users[addr].groups = []
            db.users[addr].groups.append(group.id)
    
    return group

@router.get("/list")
async def list_groups(user: UserProfile = Depends(get_current_user)) -> List[Group]:
    """List all groups the user is a member of."""
    return [
        group for group in db.groups.values()
        if user.wallet_address in group.members
    ]

@router.post("/{group_id}/messages/send")
async def send_group_message(
    group_id: str,
    content: str,
    message_type: MessageType = MessageType.TEXT,
    media_url: Optional[str] = None,
    user: UserProfile = Depends(get_current_user)
):
    """Send a message to a group."""
    if group_id not in db.groups:
        raise HTTPException(status_code=404, detail="Group not found")
    
    group = db.groups[group_id]
    if user.wallet_address not in group.members:
        raise HTTPException(status_code=403, detail="Not a group member")
    
    # Encrypt message content
    encrypted_content = encryption_service.encrypt_group_message(content, group_id)
    
    message = GroupMessage(
        id=str(uuid.uuid4()),
        group_id=group_id,
        sender_address=user.wallet_address,
        content=content,
        message_type=message_type,
        media_url=media_url,
        encrypted_content=encrypted_content
    )
    
    db.group_messages[message.id] = message
    
    # Broadcast message to all online group members
    from ..main import manager
    await manager.broadcast_group_message(message)
    
    return message

@router.get("/{group_id}/messages")
async def get_group_messages(
    group_id: str,
    user: UserProfile = Depends(get_current_user)
) -> List[GroupMessage]:
    """Get all messages in a group."""
    if group_id not in db.groups:
        raise HTTPException(status_code=404, detail="Group not found")
    
    group = db.groups[group_id]
    if user.wallet_address not in group.members:
        raise HTTPException(status_code=403, detail="Not a group member")
    
    messages = [
        msg for msg in db.group_messages.values()
        if msg.group_id == group_id
    ]
    messages.sort(key=lambda x: x.timestamp)
    return messages

@router.post("/{group_id}/add_member")
async def add_group_member(
    group_id: str,
    member_address: str,
    user: UserProfile = Depends(get_current_user)
):
    """Add a new member to the group."""
    if group_id not in db.groups:
        raise HTTPException(status_code=404, detail="Group not found")
    
    group = db.groups[group_id]
    if user.wallet_address not in group.members:
        raise HTTPException(status_code=403, detail="Not a group member")
    
    if group.members[user.wallet_address] != GroupRole.ADMIN:
        raise HTTPException(status_code=403, detail="Only admins can add members")
    
    if member_address in group.members:
        raise HTTPException(status_code=400, detail="Already a member")
    
    # Add member to group
    group.members[member_address] = GroupRole.MEMBER
    
    # Add group to member's profile
    if member_address in db.users:
        db.users[member_address].groups.append(group_id)
    
    db.groups[group_id] = group
    return group


@router.post("/{group_id}/remove_member")
async def remove_group_member(
    group_id: str,
    member_address: str,
    user: UserProfile = Depends(get_current_user)
):
    """Remove a member from the group."""
    if group_id not in db.groups:
        raise HTTPException(status_code=404, detail="Group not found")
    
    group = db.groups[group_id]
    if user.wallet_address not in group.members:
        raise HTTPException(status_code=403, detail="Not a group member")
    
    if group.members[user.wallet_address] != GroupRole.ADMIN:
        raise HTTPException(status_code=403, detail="Only admins can remove members")
    
    if member_address not in group.members:
        raise HTTPException(status_code=404, detail="Member not found")
    
    if member_address == group.creator_address:
        raise HTTPException(status_code=403, detail="Cannot remove group creator")
    
    # Remove member from group
    del group.members[member_address]
    
    # Remove group from member's profile
    if member_address in db.users:
        if group_id in db.users[member_address].groups:
            db.users[member_address].groups.remove(group_id)
    
    db.groups[group_id] = group
    return group

@router.delete("/{group_id}")
async def delete_group(
    group_id: str,
    user: UserProfile = Depends(get_current_user)
):
    """Delete a group (creator only)."""
    if group_id not in db.groups:
        raise HTTPException(status_code=404, detail="Group not found")
    
    group = db.groups[group_id]
    if user.wallet_address != group.creator_address:
        raise HTTPException(status_code=403, detail="Only creator can delete group")
    
    # Remove group from all members' profiles
    for member_address in group.members:
        if member_address in db.users:
            if group_id in db.users[member_address].groups:
                db.users[member_address].groups.remove(group_id)
    
    # Remove group messages
    db.group_messages = {
        k: v for k, v in db.group_messages.items()
        if v.group_id != group_id
    }
    
    # Remove group
    del db.groups[group_id]
    
    # Remove encryption key
    encryption_service.remove_group_key(group_id)
    
    return {"status": "success"}
