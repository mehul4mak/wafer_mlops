from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from enum import Enum


class GroupType(str, Enum):
    trip = "trip"
    flatmate = "flatmate"
    project = "project"
    event = "event"
    wedding = "wedding"
    office = "office"
    family = "family"
    custom = "custom"


class MemberRole(str, Enum):
    owner = "owner"
    admin = "admin"
    member = "member"


class GroupCreate(BaseModel):
    name: str
    description: Optional[str] = None
    type: GroupType = GroupType.custom
    currency: str = "USD"


class GroupUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    currency: Optional[str] = None
    image_url: Optional[str] = None


class MemberResponse(BaseModel):
    id: str
    user_id: str
    full_name: Optional[str]
    email: str
    avatar_url: Optional[str]
    role: MemberRole
    joined_at: datetime


class GroupResponse(BaseModel):
    id: str
    name: str
    description: Optional[str]
    type: GroupType
    invite_code: str
    owner_id: str
    currency: str
    image_url: Optional[str]
    is_active: bool
    member_count: Optional[int] = 0
    total_expenses: Optional[float] = 0.0
    my_balance: Optional[float] = 0.0
    created_at: datetime

    class Config:
        from_attributes = True


class GroupDetailResponse(GroupResponse):
    members: List[MemberResponse] = []


class InviteMemberRequest(BaseModel):
    email: str


class UpdateMemberRoleRequest(BaseModel):
    role: MemberRole


class JoinGroupRequest(BaseModel):
    invite_code: str
