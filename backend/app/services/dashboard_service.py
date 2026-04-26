from supabase import Client
from app.schemas.dashboard import DashboardResponse, MonthlySpend, RecentActivity
from typing import List
from datetime import datetime, date, timedelta
import calendar


class DashboardService:
    def __init__(self, db: Client):
        self.db = db

    async def get_dashboard(self, user_id: str) -> DashboardResponse:
        groups_res = self.db.table("group_members").select("group_id").eq("user_id", user_id).execute()
        group_ids = [r["group_id"] for r in groups_res.data]

        total_owed, total_owe = 0.0, 0.0
        if group_ids:
            balance_res = self.db.table("group_balances").select("net_balance").eq("user_id", user_id).in_("group_id", group_ids).execute()
            for b in balance_res.data:
                nb = float(b.get("net_balance", 0))
                if nb > 0:
                    total_owed += nb
                else:
                    total_owe += abs(nb)

        pending_tasks = 0
        if group_ids:
            tasks_res = self.db.table("tasks").select("id", count="exact") \
                .in_("group_id", group_ids) \
                .eq("assigned_to", user_id) \
                .eq("status", "pending") \
                .execute()
            pending_tasks = tasks_res.count or 0

        unread = self.db.table("notifications").select("id", count="exact").eq("user_id", user_id).eq("is_read", False).execute()
        unread_count = unread.count or 0

        monthly_spend = await self._monthly_spend(user_id, group_ids)
        recent_activity = await self._recent_activity(user_id, group_ids)
        top_groups = await self._top_groups(user_id, group_ids)

        return DashboardResponse(
            total_owed=round(total_owed, 2),
            total_owe=round(total_owe, 2),
            net_balance=round(total_owed - total_owe, 2),
            active_groups=len(group_ids),
            pending_tasks=pending_tasks,
            unread_notifications=unread_count,
            monthly_spend=monthly_spend,
            recent_activity=recent_activity,
            top_groups=top_groups,
        )

    async def _monthly_spend(self, user_id: str, group_ids: List[str]) -> List[MonthlySpend]:
        if not group_ids:
            return []
        six_months_ago = (date.today() - timedelta(days=180)).isoformat()
        res = self.db.table("expenses").select("amount, date, paid_by") \
            .in_("group_id", group_ids) \
            .gte("date", six_months_ago) \
            .execute()

        monthly: dict = {}
        for e in res.data:
            month_key = e["date"][:7]
            if month_key not in monthly:
                monthly[month_key] = {"total": 0.0, "my_share": 0.0}
            monthly[month_key]["total"] += float(e["amount"])

        splits_res = self.db.table("expense_splits").select("amount, expenses(date, group_id)") \
            .eq("user_id", user_id) \
            .execute()
        for s in splits_res.data:
            exp = (s.get("expenses") or {})
            if exp.get("group_id") in group_ids and exp.get("date"):
                month_key = exp["date"][:7]
                if month_key not in monthly:
                    monthly[month_key] = {"total": 0.0, "my_share": 0.0}
                monthly[month_key]["my_share"] += float(s["amount"])

        result = []
        for month, vals in sorted(monthly.items())[-6:]:
            y, m = month.split("-")
            result.append(MonthlySpend(
                month=f"{calendar.month_abbr[int(m)]} {y}",
                total=round(vals["total"], 2),
                my_share=round(vals["my_share"], 2),
            ))
        return result

    async def _recent_activity(self, user_id: str, group_ids: List[str]) -> List[RecentActivity]:
        if not group_ids:
            return []
        res = self.db.table("expenses").select("id, title, amount, created_at, group_id, groups(name)") \
            .in_("group_id", group_ids).order("created_at", desc=True).limit(10).execute()

        activities = []
        for e in res.data:
            group_name = (e.get("groups") or {}).get("name")
            activities.append(RecentActivity(
                type="expense",
                title=e["title"],
                subtitle=f"in {group_name}" if group_name else "",
                amount=float(e["amount"]),
                created_at=e["created_at"],
                group_id=e["group_id"],
                group_name=group_name,
            ))
        return activities

    async def _top_groups(self, user_id: str, group_ids: List[str]) -> List[dict]:
        if not group_ids:
            return []
        res = self.db.table("groups").select("id, name, type, image_url").in_("id", group_ids).eq("is_active", True).limit(5).execute()
        return res.data or []
