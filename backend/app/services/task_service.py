from supabase import Client
from fastapi import HTTPException
from app.schemas.tasks import TaskCreate, TaskUpdate, TaskResponse
from typing import List
from datetime import date


class TaskService:
    def __init__(self, db: Client):
        self.db = db

    async def create_task(self, group_id: str, user_id: str, req: TaskCreate) -> TaskResponse:
        self._assert_member(group_id, user_id)
        data = {
            "group_id": group_id,
            "expense_id": req.expense_id,
            "title": req.title,
            "description": req.description,
            "assigned_to": req.assigned_to,
            "created_by": user_id,
            "due_date": str(req.due_date) if req.due_date else None,
            "priority": req.priority,
        }
        res = self.db.table("tasks").insert(data).execute()
        if not res.data:
            raise HTTPException(status_code=400, detail="Failed to create task")
        return await self._enrich_task(res.data[0])

    async def get_group_tasks(self, group_id: str, user_id: str, status: str | None = None) -> List[TaskResponse]:
        self._assert_member(group_id, user_id)
        query = self.db.table("tasks").select("*").eq("group_id", group_id)
        if status:
            query = query.eq("status", status)
        res = query.order("due_date").execute()
        return [await self._enrich_task(t) for t in res.data]

    async def get_task(self, task_id: str, user_id: str) -> TaskResponse:
        res = self.db.table("tasks").select("*").eq("id", task_id).single().execute()
        if not res.data:
            raise HTTPException(status_code=404, detail="Task not found")
        self._assert_member(res.data["group_id"], user_id)
        return await self._enrich_task(res.data)

    async def update_task(self, task_id: str, user_id: str, req: TaskUpdate) -> TaskResponse:
        task_res = self.db.table("tasks").select("group_id, assigned_to, created_by").eq("id", task_id).single().execute()
        if not task_res.data:
            raise HTTPException(status_code=404, detail="Task not found")
        t = task_res.data
        if t["created_by"] != user_id and t.get("assigned_to") != user_id:
            role_res = self.db.table("group_members").select("role").eq("group_id", t["group_id"]).eq("user_id", user_id).single().execute()
            if not role_res.data or role_res.data["role"] not in ("owner", "admin"):
                raise HTTPException(status_code=403, detail="Cannot update this task")

        update_data = req.model_dump(exclude_none=True)
        if "due_date" in update_data:
            update_data["due_date"] = str(update_data["due_date"])
        self.db.table("tasks").update(update_data).eq("id", task_id).execute()
        return await self.get_task(task_id, user_id)

    async def delete_task(self, task_id: str, user_id: str) -> None:
        task_res = self.db.table("tasks").select("group_id, created_by").eq("id", task_id).single().execute()
        if not task_res.data:
            raise HTTPException(status_code=404, detail="Task not found")
        if task_res.data["created_by"] != user_id:
            raise HTTPException(status_code=403, detail="Cannot delete this task")
        self.db.table("tasks").delete().eq("id", task_id).execute()

    async def _enrich_task(self, t: dict) -> TaskResponse:
        assigned_profile = self._get_profile(t["assigned_to"]) if t.get("assigned_to") else {}
        creator_profile = self._get_profile(t["created_by"])
        expense_title = None
        if t.get("expense_id"):
            er = self.db.table("expenses").select("title").eq("id", t["expense_id"]).single().execute()
            expense_title = er.data["title"] if er.data else None

        is_overdue = False
        if t.get("due_date") and t["status"] != "completed":
            due = date.fromisoformat(str(t["due_date"]))
            is_overdue = due < date.today()

        return TaskResponse(
            **t,
            assigned_to_name=assigned_profile.get("full_name"),
            assigned_to_avatar=assigned_profile.get("avatar_url"),
            created_by_name=creator_profile.get("full_name"),
            expense_title=expense_title,
            is_overdue=is_overdue,
        )

    def _get_profile(self, user_id: str) -> dict:
        res = self.db.table("profiles").select("full_name, avatar_url").eq("id", user_id).single().execute()
        return res.data or {}

    def _assert_member(self, group_id: str, user_id: str) -> None:
        res = self.db.table("group_members").select("id").eq("group_id", group_id).eq("user_id", user_id).execute()
        if not res.data:
            raise HTTPException(status_code=403, detail="Not a group member")
