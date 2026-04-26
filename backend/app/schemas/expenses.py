from pydantic import BaseModel, field_validator
from typing import Optional, List, Dict
from datetime import datetime, date
from enum import Enum


class SplitType(str, Enum):
    equal = "equal"
    exact = "exact"
    percentage = "percentage"


class ExpenseCategory(str, Enum):
    general = "general"
    food = "food"
    transport = "transport"
    accommodation = "accommodation"
    entertainment = "entertainment"
    utilities = "utilities"
    groceries = "groceries"
    health = "health"
    shopping = "shopping"
    other = "other"


class SplitParticipant(BaseModel):
    user_id: str
    amount: Optional[float] = None
    percentage: Optional[float] = None


class ExpenseCreate(BaseModel):
    title: str
    description: Optional[str] = None
    amount: float
    currency: str = "USD"
    paid_by: str
    split_type: SplitType = SplitType.equal
    category: ExpenseCategory = ExpenseCategory.general
    date: date
    notes: Optional[str] = None
    participants: List[SplitParticipant]
    task_title: Optional[str] = None
    task_due_date: Optional[date] = None
    task_assigned_to: Optional[str] = None

    @field_validator("amount")
    @classmethod
    def amount_must_be_positive(cls, v: float) -> float:
        if v <= 0:
            raise ValueError("Amount must be positive")
        return round(v, 2)


class ExpenseUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    amount: Optional[float] = None
    category: Optional[ExpenseCategory] = None
    date: Optional[date] = None
    notes: Optional[str] = None
    receipt_url: Optional[str] = None


class SplitResponse(BaseModel):
    id: str
    user_id: str
    full_name: Optional[str]
    avatar_url: Optional[str]
    amount: float
    percentage: Optional[float]
    is_settled: bool
    settled_at: Optional[datetime]


class ExpenseResponse(BaseModel):
    id: str
    group_id: str
    title: str
    description: Optional[str]
    amount: float
    currency: str
    paid_by: str
    paid_by_name: Optional[str]
    paid_by_avatar: Optional[str]
    split_type: SplitType
    category: ExpenseCategory
    date: date
    notes: Optional[str]
    receipt_url: Optional[str]
    splits: List[SplitResponse] = []
    created_at: datetime

    class Config:
        from_attributes = True


class UploadReceiptResponse(BaseModel):
    url: str
    expense_id: str
