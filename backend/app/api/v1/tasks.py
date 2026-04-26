from fastapi import APIRouter, Depends, Query
from supabase import Client
from typing import List, Optional
from app.core.dependencies import get_current_user_id, get_db
from app.services.task_service import TaskService
from app.schemas.tasks import TaskCreate, TaskUpdate, TaskResponse

router = APIRouter(prefix="/groups/{group_id}/tasks", tags=["Tasks"])


@router.post("", response_model=TaskResponse, status_code=201)
async def create_task(group_id: str, req: TaskCreate, user_id: str = Depends(get_current_user_id), db: Client = Depends(get_db)):
    return await TaskService(db).create_task(group_id, user_id, req)


@router.get("", response_model=List[TaskResponse])
async def list_tasks(
    group_id: str,
    status: Optional[str] = Query(None),
    user_id: str = Depends(get_current_user_id),
    db: Client = Depends(get_db),
):
    return await TaskService(db).get_group_tasks(group_id, user_id, status)


@router.get("/{task_id}", response_model=TaskResponse)
async def get_task(task_id: str, group_id: str, user_id: str = Depends(get_current_user_id), db: Client = Depends(get_db)):
    return await TaskService(db).get_task(task_id, user_id)


@router.patch("/{task_id}", response_model=TaskResponse)
async def update_task(task_id: str, group_id: str, req: TaskUpdate, user_id: str = Depends(get_current_user_id), db: Client = Depends(get_db)):
    return await TaskService(db).update_task(task_id, user_id, req)


@router.delete("/{task_id}", status_code=204)
async def delete_task(task_id: str, group_id: str, user_id: str = Depends(get_current_user_id), db: Client = Depends(get_db)):
    await TaskService(db).delete_task(task_id, user_id)
