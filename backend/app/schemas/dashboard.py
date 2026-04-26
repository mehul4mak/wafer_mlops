from pydantic import BaseModel
from typing import List, Optional
from datetime import date


class MonthlySpend(BaseModel):
    month: str
    total: float
    my_share: float


class RecentActivity(BaseModel):
    type: str
    title: str
    subtitle: str
    amount: Optional[float]
    created_at: str
    group_id: Optional[str]
    group_name: Optional[str]


class DashboardResponse(BaseModel):
    total_owed: float
    total_owe: float
    net_balance: float
    active_groups: int
    pending_tasks: int
    unread_notifications: int
    monthly_spend: List[MonthlySpend]
    recent_activity: List[RecentActivity]
    top_groups: List[dict]
