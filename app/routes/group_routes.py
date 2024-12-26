from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
from ..models.group import Group, GroupMessage
from ..services.group_service import GroupService
from ..dependencies import get_group_service, get_current_user

router = APIRouter(prefix="/groups", tags=["groups"])

@router.post("/create", response_model=Group)
async def create_group(
    name: str,
    required_nft: Optional[str] = None,
    description: Optional[str] = None,
    avatar_url: Optional[str] = None,
    group_service: GroupService = Depends(get_group_service),
    current_user: str = Depends(get_current_user)
):
    try:
        return await group_service.create_group(
            name=name,
            created_by=current_user,
            required_nft=required_nft,
            description=description,
            avatar_url=avatar_url
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/{group_id}/join", response_model=Group)
async def join_group(
    group_id: str,
    group_service: GroupService = Depends(get_group_service),
    current_user: str = Depends(get_current_user)
):
    try:
        return await group_service.join_group(group_id, current_user)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/{group_id}/leave")
async def leave_group(
    group_id: str,
    group_service: GroupService = Depends(get_group_service),
    current_user: str = Depends(get_current_user)
):
    try:
        success = await group_service.leave_group(group_id, current_user)
        if success:
            return {"message": "Successfully left group"}
        raise HTTPException(status_code=400, detail="Not a member of this group")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/{group_id}/messages", response_model=GroupMessage)
async def send_message(
    group_id: str,
    content: str,
    reply_to: Optional[str] = None,
    media_url: Optional[str] = None,
    media_type: Optional[str] = None,
    group_service: GroupService = Depends(get_group_service),
    current_user: str = Depends(get_current_user)
):
    try:
        return await group_service.send_message(
            group_id=group_id,
            sender=current_user,
            content=content,
            reply_to=reply_to,
            media_url=media_url,
            media_type=media_type
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/me", response_model=List[Group])
async def get_my_groups(
    group_service: GroupService = Depends(get_group_service),
    current_user: str = Depends(get_current_user)
):
    return await group_service.get_user_groups(current_user)
