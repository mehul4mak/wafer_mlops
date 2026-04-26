from fastapi import APIRouter, Depends
from supabase import Client
from typing import List
from app.core.dependencies import get_current_user_id, get_db
from app.services.group_service import GroupService
from app.schemas.groups import (
    GroupCreate, GroupUpdate, GroupResponse, GroupDetailResponse,
    MemberResponse, InviteMemberRequest, UpdateMemberRoleRequest, JoinGroupRequest
)

router = APIRouter(prefix="/groups", tags=["Groups"])


@router.post("", response_model=GroupDetailResponse, status_code=201)
async def create_group(req: GroupCreate, user_id: str = Depends(get_current_user_id), db: Client = Depends(get_db)):
    return await GroupService(db).create_group(user_id, req)


@router.get("", response_model=List[GroupResponse])
async def list_groups(user_id: str = Depends(get_current_user_id), db: Client = Depends(get_db)):
    return await GroupService(db).get_user_groups(user_id)


@router.post("/join", response_model=GroupDetailResponse)
async def join_group(req: JoinGroupRequest, user_id: str = Depends(get_current_user_id), db: Client = Depends(get_db)):
    return await GroupService(db).join_by_invite(req.invite_code, user_id)


@router.get("/{group_id}", response_model=GroupDetailResponse)
async def get_group(group_id: str, user_id: str = Depends(get_current_user_id), db: Client = Depends(get_db)):
    return await GroupService(db).get_group(group_id, user_id)


@router.patch("/{group_id}", response_model=GroupResponse)
async def update_group(group_id: str, req: GroupUpdate, user_id: str = Depends(get_current_user_id), db: Client = Depends(get_db)):
    return await GroupService(db).update_group(group_id, user_id, req)


@router.delete("/{group_id}", status_code=204)
async def delete_group(group_id: str, user_id: str = Depends(get_current_user_id), db: Client = Depends(get_db)):
    await GroupService(db).delete_group(group_id, user_id)


@router.get("/{group_id}/members", response_model=List[MemberResponse])
async def get_members(group_id: str, user_id: str = Depends(get_current_user_id), db: Client = Depends(get_db)):
    svc = GroupService(db)
    svc._assert_member(group_id, user_id)
    return await svc.get_members(group_id)


@router.delete("/{group_id}/members/{target_user_id}", status_code=204)
async def remove_member(group_id: str, target_user_id: str, user_id: str = Depends(get_current_user_id), db: Client = Depends(get_db)):
    await GroupService(db).remove_member(group_id, target_user_id, user_id)


@router.patch("/{group_id}/members/{target_user_id}/role", status_code=204)
async def update_member_role(group_id: str, target_user_id: str, req: UpdateMemberRoleRequest, user_id: str = Depends(get_current_user_id), db: Client = Depends(get_db)):
    await GroupService(db).update_member_role(group_id, target_user_id, user_id, req)
