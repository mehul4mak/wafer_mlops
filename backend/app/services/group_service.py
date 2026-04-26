from supabase import Client
from fastapi import HTTPException
from app.schemas.groups import (
    GroupCreate, GroupUpdate, GroupResponse, GroupDetailResponse,
    MemberResponse, InviteMemberRequest, UpdateMemberRoleRequest
)
from typing import List


class GroupService:
    def __init__(self, db: Client):
        self.db = db

    async def create_group(self, user_id: str, req: GroupCreate) -> GroupResponse:
        group_data = {**req.model_dump(), "owner_id": user_id}
        res = self.db.table("groups").insert(group_data).execute()
        if not res.data:
            raise HTTPException(status_code=400, detail="Failed to create group")

        group = res.data[0]
        # Add creator as owner member
        self.db.table("group_members").insert({
            "group_id": group["id"],
            "user_id": user_id,
            "role": "owner",
        }).execute()

        return await self.get_group(group["id"], user_id)

    async def get_user_groups(self, user_id: str) -> List[GroupResponse]:
        res = self.db.table("group_members") \
            .select("group_id, role") \
            .eq("user_id", user_id) \
            .execute()

        group_ids = [r["group_id"] for r in res.data]
        if not group_ids:
            return []

        groups_res = self.db.table("groups") \
            .select("*") \
            .in_("id", group_ids) \
            .eq("is_active", True) \
            .execute()

        result = []
        for g in groups_res.data:
            member_count = self._get_member_count(g["id"])
            my_balance = self._get_my_balance(g["id"], user_id)
            result.append(GroupResponse(
                **g,
                member_count=member_count,
                my_balance=my_balance,
            ))
        return result

    async def get_group(self, group_id: str, user_id: str) -> GroupDetailResponse:
        self._assert_member(group_id, user_id)
        res = self.db.table("groups").select("*").eq("id", group_id).single().execute()
        if not res.data:
            raise HTTPException(status_code=404, detail="Group not found")

        members = await self.get_members(group_id)
        return GroupDetailResponse(
            **res.data,
            member_count=len(members),
            my_balance=self._get_my_balance(group_id, user_id),
            members=members,
        )

    async def update_group(self, group_id: str, user_id: str, req: GroupUpdate) -> GroupResponse:
        self._assert_admin(group_id, user_id)
        update_data = req.model_dump(exclude_none=True)
        res = self.db.table("groups").update(update_data).eq("id", group_id).execute()
        if not res.data:
            raise HTTPException(status_code=400, detail="Update failed")
        return await self.get_group(group_id, user_id)

    async def delete_group(self, group_id: str, user_id: str) -> None:
        self._assert_owner(group_id, user_id)
        self.db.table("groups").update({"is_active": False}).eq("id", group_id).execute()

    async def join_by_invite(self, invite_code: str, user_id: str) -> GroupResponse:
        res = self.db.table("groups").select("*").eq("invite_code", invite_code).eq("is_active", True).single().execute()
        if not res.data:
            raise HTTPException(status_code=404, detail="Invalid invite code")
        group = res.data

        existing = self.db.table("group_members") \
            .select("id") \
            .eq("group_id", group["id"]) \
            .eq("user_id", user_id) \
            .execute()
        if existing.data:
            raise HTTPException(status_code=409, detail="Already a member")

        self.db.table("group_members").insert({
            "group_id": group["id"],
            "user_id": user_id,
            "role": "member",
        }).execute()

        return await self.get_group(group["id"], user_id)

    async def get_members(self, group_id: str) -> List[MemberResponse]:
        res = self.db.table("group_members") \
            .select("id, user_id, role, joined_at, profiles(email, full_name, avatar_url)") \
            .eq("group_id", group_id) \
            .execute()

        members = []
        for m in res.data:
            profile = m.get("profiles") or {}
            members.append(MemberResponse(
                id=m["id"],
                user_id=m["user_id"],
                email=profile.get("email", ""),
                full_name=profile.get("full_name"),
                avatar_url=profile.get("avatar_url"),
                role=m["role"],
                joined_at=m["joined_at"],
            ))
        return members

    async def remove_member(self, group_id: str, target_user_id: str, requester_id: str) -> None:
        if target_user_id == requester_id:
            self.db.table("group_members").delete().eq("group_id", group_id).eq("user_id", target_user_id).execute()
            return
        self._assert_admin(group_id, requester_id)
        self.db.table("group_members").delete().eq("group_id", group_id).eq("user_id", target_user_id).execute()

    async def update_member_role(self, group_id: str, target_user_id: str, requester_id: str, req: UpdateMemberRoleRequest) -> None:
        self._assert_owner(group_id, requester_id)
        self.db.table("group_members").update({"role": req.role}).eq("group_id", group_id).eq("user_id", target_user_id).execute()

    def _get_member_count(self, group_id: str) -> int:
        res = self.db.table("group_members").select("id", count="exact").eq("group_id", group_id).execute()
        return res.count or 0

    def _get_my_balance(self, group_id: str, user_id: str) -> float:
        res = self.db.table("group_balances").select("net_balance").eq("group_id", group_id).eq("user_id", user_id).execute()
        if res.data:
            return float(res.data[0].get("net_balance", 0))
        return 0.0

    def _get_role(self, group_id: str, user_id: str) -> str | None:
        res = self.db.table("group_members").select("role").eq("group_id", group_id).eq("user_id", user_id).single().execute()
        return res.data["role"] if res.data else None

    def _assert_member(self, group_id: str, user_id: str) -> None:
        if not self._get_role(group_id, user_id):
            raise HTTPException(status_code=403, detail="Not a group member")

    def _assert_admin(self, group_id: str, user_id: str) -> None:
        role = self._get_role(group_id, user_id)
        if role not in ("owner", "admin"):
            raise HTTPException(status_code=403, detail="Admin access required")

    def _assert_owner(self, group_id: str, user_id: str) -> None:
        if self._get_role(group_id, user_id) != "owner":
            raise HTTPException(status_code=403, detail="Owner access required")
