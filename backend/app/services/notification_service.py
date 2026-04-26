from supabase import Client
from app.schemas.notifications import NotificationResponse, NotificationType
from typing import List
import resend
from app.core.config import settings


class NotificationService:
    def __init__(self, db: Client):
        self.db = db

    async def get_user_notifications(self, user_id: str, unread_only: bool = False) -> List[NotificationResponse]:
        query = self.db.table("notifications").select("*").eq("user_id", user_id)
        if unread_only:
            query = query.eq("is_read", False)
        res = query.order("created_at", desc=True).limit(50).execute()
        return [NotificationResponse(**n) for n in res.data]

    async def mark_read(self, user_id: str, notification_ids: List[str]) -> None:
        self.db.table("notifications").update({"is_read": True}) \
            .eq("user_id", user_id) \
            .in_("id", notification_ids) \
            .execute()

    async def mark_all_read(self, user_id: str) -> None:
        self.db.table("notifications").update({"is_read": True}).eq("user_id", user_id).execute()

    async def create_notification(
        self,
        user_id: str,
        type: NotificationType,
        title: str,
        message: str,
        data: dict | None = None,
    ) -> None:
        self.db.table("notifications").insert({
            "user_id": user_id,
            "type": type,
            "title": title,
            "message": message,
            "data": data or {},
        }).execute()

    async def notify_new_expense(self, expense: dict, group: dict, payer_name: str, member_ids: List[str], paid_by_id: str) -> None:
        for uid in member_ids:
            if uid == paid_by_id:
                continue
            await self.create_notification(
                user_id=uid,
                type=NotificationType.new_expense,
                title="New expense added",
                message=f"{payer_name} added '{expense['title']}' in {group['name']}",
                data={"expense_id": expense["id"], "group_id": group["id"]},
            )

    async def notify_settlement_request(self, settlement: dict, payer_name: str, payee_id: str) -> None:
        await self.create_notification(
            user_id=payee_id,
            type=NotificationType.settlement_request,
            title="Settlement request",
            message=f"{payer_name} marked a payment of ${settlement['amount']:.2f} to you",
            data={"settlement_id": settlement["id"]},
        )

    async def notify_task_assigned(self, task: dict, assigner_name: str, assignee_id: str) -> None:
        await self.create_notification(
            user_id=assignee_id,
            type=NotificationType.task_assigned,
            title="Task assigned to you",
            message=f"{assigner_name} assigned you: '{task['title']}'",
            data={"task_id": task["id"], "group_id": task["group_id"]},
        )

    async def send_email_notification(self, to_email: str, subject: str, html: str) -> None:
        if not settings.RESEND_API_KEY:
            return
        try:
            resend.api_key = settings.RESEND_API_KEY
            resend.Emails.send({
                "from": settings.FROM_EMAIL,
                "to": [to_email],
                "subject": subject,
                "html": html,
            })
        except Exception:
            pass  # Email is best-effort in MVP

    async def get_unread_count(self, user_id: str) -> int:
        res = self.db.table("notifications").select("id", count="exact").eq("user_id", user_id).eq("is_read", False).execute()
        return res.count or 0
