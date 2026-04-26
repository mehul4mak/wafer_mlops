from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, date
from enum import Enum


class TaskStatus(str, Enum):
    pending = "pending"
    in_progress = "in_progress"
    completed = "completed"


class TaskPriority(str, Enum):
    low = "low"
    medium = "medium"
    high = "high"


class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    assigned_to: Optional[str] = None
    due_date: Optional[date] = None
    priority: TaskPriority = TaskPriority.medium
    expense_id: Optional[str] = None


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    assigned_to: Optional[str] = None
    due_date: Optional[date] = None
    status: Optional[TaskStatus] = None
    priority: Optional[TaskPriority] = None


class TaskResponse(BaseModel):
    id: str
    group_id: str
    expense_id: Optional[str]
    expense_title: Optional[str]
    title: str
    description: Optional[str]
    assigned_to: Optional[str]
    assigned_to_name: Optional[str]
    assigned_to_avatar: Optional[str]
    created_by: str
    created_by_name: Optional[str]
    due_date: Optional[date]
    status: TaskStatus
    priority: TaskPriority
    is_overdue: bool = False
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
