from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from enum import Enum


class SettlementStatus(str, Enum):
    pending = "pending"
    completed = "completed"
    cancelled = "cancelled"


class SettlementCreate(BaseModel):
    group_id: str
    payee_id: str
    amount: float
    currency: str = "USD"
    notes: Optional[str] = None


class SettlementUpdate(BaseModel):
    status: Optional[SettlementStatus] = None
    notes: Optional[str] = None
    proof_url: Optional[str] = None


class SettlementResponse(BaseModel):
    id: str
    group_id: str
    payer_id: str
    payer_name: Optional[str]
    payer_avatar: Optional[str]
    payee_id: str
    payee_name: Optional[str]
    payee_avatar: Optional[str]
    amount: float
    currency: str
    notes: Optional[str]
    status: SettlementStatus
    proof_url: Optional[str]
    settled_at: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True


class DebtSummary(BaseModel):
    from_user_id: str
    from_user_name: Optional[str]
    from_user_avatar: Optional[str]
    to_user_id: str
    to_user_name: Optional[str]
    to_user_avatar: Optional[str]
    amount: float
    currency: str


class GroupBalanceResponse(BaseModel):
    user_id: str
    full_name: Optional[str]
    email: str
    avatar_url: Optional[str]
    net_balance: float
    owes: List[DebtSummary] = []
    owed_by: List[DebtSummary] = []


class SimplifiedDebtsResponse(BaseModel):
    group_id: str
    currency: str
    transactions: List[DebtSummary]
    total_outstanding: float
