from pydantic import BaseModel
from typing import Optional, Any
from datetime import datetime
from enum import Enum


class NotificationType(str, Enum):
    new_expense = "new_expense"
    expense_settled = "expense_settled"
    settlement_request = "settlement_request"
    settlement_completed = "settlement_completed"
    task_assigned = "task_assigned"
    task_due = "task_due"
    group_invite = "group_invite"
    balance_reminder = "balance_reminder"
    payment_proof = "payment_proof"


class NotificationResponse(BaseModel):
    id: str
    type: NotificationType
    title: str
    message: str
    data: Optional[Any]
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True


class NotificationMarkRead(BaseModel):
    notification_ids: list[str]
