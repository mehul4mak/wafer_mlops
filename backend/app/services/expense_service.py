from supabase import Client
from fastapi import HTTPException
from app.schemas.expenses import ExpenseCreate, ExpenseUpdate, ExpenseResponse, SplitResponse
from typing import List, Dict
import math


class ExpenseService:
    def __init__(self, db: Client):
        self.db = db

    async def create_expense(self, group_id: str, user_id: str, req: ExpenseCreate) -> ExpenseResponse:
        self._assert_member(group_id, user_id)

        expense_data = {
            "group_id": group_id,
            "title": req.title,
            "description": req.description,
            "amount": req.amount,
            "currency": req.currency,
            "paid_by": req.paid_by,
            "split_type": req.split_type,
            "category": req.category,
            "date": str(req.date),
            "notes": req.notes,
            "created_by": user_id,
        }
        res = self.db.table("expenses").insert(expense_data).execute()
        if not res.data:
            raise HTTPException(status_code=400, detail="Failed to create expense")

        expense = res.data[0]
        splits = self._calculate_splits(req.amount, req.participants, req.split_type)
        split_records = [
            {"expense_id": expense["id"], "user_id": uid, "amount": amt,
             "percentage": next((p.percentage for p in req.participants if p.user_id == uid), None)}
            for uid, amt in splits.items()
        ]
        self.db.table("expense_splits").insert(split_records).execute()

        # Optionally create linked task
        if req.task_title:
            self.db.table("tasks").insert({
                "group_id": group_id,
                "expense_id": expense["id"],
                "title": req.task_title,
                "due_date": str(req.task_due_date) if req.task_due_date else None,
                "assigned_to": req.task_assigned_to,
                "created_by": user_id,
            }).execute()

        return await self.get_expense(expense["id"], user_id)

    async def get_group_expenses(self, group_id: str, user_id: str, limit: int = 50, offset: int = 0) -> List[ExpenseResponse]:
        self._assert_member(group_id, user_id)
        res = self.db.table("expenses") \
            .select("*") \
            .eq("group_id", group_id) \
            .order("date", desc=True) \
            .range(offset, offset + limit - 1) \
            .execute()

        result = []
        for e in res.data:
            splits = await self._get_splits(e["id"])
            payer = self._get_profile(e["paid_by"])
            result.append(ExpenseResponse(
                **e,
                paid_by_name=payer.get("full_name") if payer else None,
                paid_by_avatar=payer.get("avatar_url") if payer else None,
                splits=splits,
            ))
        return result

    async def get_expense(self, expense_id: str, user_id: str) -> ExpenseResponse:
        res = self.db.table("expenses").select("*").eq("id", expense_id).single().execute()
        if not res.data:
            raise HTTPException(status_code=404, detail="Expense not found")
        e = res.data
        splits = await self._get_splits(expense_id)
        payer = self._get_profile(e["paid_by"])
        return ExpenseResponse(
            **e,
            paid_by_name=payer.get("full_name") if payer else None,
            paid_by_avatar=payer.get("avatar_url") if payer else None,
            splits=splits,
        )

    async def update_expense(self, expense_id: str, user_id: str, req: ExpenseUpdate) -> ExpenseResponse:
        update_data = req.model_dump(exclude_none=True)
        if "date" in update_data:
            update_data["date"] = str(update_data["date"])
        self.db.table("expenses").update(update_data).eq("id", expense_id).execute()
        return await self.get_expense(expense_id, user_id)

    async def delete_expense(self, expense_id: str, user_id: str) -> None:
        expense = self.db.table("expenses").select("created_by, paid_by").eq("id", expense_id).single().execute()
        if not expense.data:
            raise HTTPException(status_code=404, detail="Expense not found")
        e = expense.data
        if e["created_by"] != user_id and e["paid_by"] != user_id:
            raise HTTPException(status_code=403, detail="Cannot delete this expense")
        self.db.table("expenses").delete().eq("id", expense_id).execute()

    async def settle_split(self, expense_id: str, user_id: str) -> None:
        from datetime import datetime, timezone
        self.db.table("expense_splits").update({
            "is_settled": True,
            "settled_at": datetime.now(timezone.utc).isoformat(),
        }).eq("expense_id", expense_id).eq("user_id", user_id).execute()

    def _calculate_splits(self, amount: float, participants, split_type) -> Dict[str, float]:
        splits: Dict[str, float] = {}
        user_ids = [p.user_id for p in participants]

        if split_type == "equal":
            base = round(amount / len(user_ids), 2)
            remainder = round(amount - base * len(user_ids), 2)
            for i, uid in enumerate(user_ids):
                splits[uid] = base + (remainder if i == 0 else 0)

        elif split_type == "exact":
            total = sum(p.amount or 0 for p in participants)
            if abs(total - amount) > 0.02:
                raise HTTPException(status_code=400, detail=f"Exact splits ({total}) don't sum to expense amount ({amount})")
            for p in participants:
                splits[p.user_id] = p.amount or 0

        elif split_type == "percentage":
            total_pct = sum(p.percentage or 0 for p in participants)
            if abs(total_pct - 100) > 0.01:
                raise HTTPException(status_code=400, detail=f"Percentages must sum to 100, got {total_pct}")
            for p in participants:
                splits[p.user_id] = round(amount * (p.percentage or 0) / 100, 2)

        return splits

    async def _get_splits(self, expense_id: str) -> List[SplitResponse]:
        res = self.db.table("expense_splits") \
            .select("*, profiles(full_name, avatar_url)") \
            .eq("expense_id", expense_id) \
            .execute()
        result = []
        for s in res.data:
            profile = s.get("profiles") or {}
            result.append(SplitResponse(
                id=s["id"],
                user_id=s["user_id"],
                full_name=profile.get("full_name"),
                avatar_url=profile.get("avatar_url"),
                amount=float(s["amount"]),
                percentage=s.get("percentage"),
                is_settled=s["is_settled"],
                settled_at=s.get("settled_at"),
            ))
        return result

    def _get_profile(self, user_id: str) -> dict:
        res = self.db.table("profiles").select("full_name, avatar_url").eq("id", user_id).single().execute()
        return res.data or {}

    def _assert_member(self, group_id: str, user_id: str) -> None:
        res = self.db.table("group_members").select("id").eq("group_id", group_id).eq("user_id", user_id).execute()
        if not res.data:
            raise HTTPException(status_code=403, detail="Not a group member")
