from fastapi import APIRouter, Depends, Query
from supabase import Client
from typing import List
from app.core.dependencies import get_current_user_id, get_db
from app.services.notification_service import NotificationService
from app.schemas.notifications import NotificationResponse, NotificationMarkRead

router = APIRouter(prefix="/notifications", tags=["Notifications"])


@router.get("", response_model=List[NotificationResponse])
async def list_notifications(
    unread_only: bool = Query(False),
    user_id: str = Depends(get_current_user_id),
    db: Client = Depends(get_db),
):
    return await NotificationService(db).get_user_notifications(user_id, unread_only)


@router.post("/read", status_code=204)
async def mark_read(req: NotificationMarkRead, user_id: str = Depends(get_current_user_id), db: Client = Depends(get_db)):
    await NotificationService(db).mark_read(user_id, req.notification_ids)


@router.post("/read-all", status_code=204)
async def mark_all_read(user_id: str = Depends(get_current_user_id), db: Client = Depends(get_db)):
    await NotificationService(db).mark_all_read(user_id)


@router.get("/count", response_model=dict)
async def unread_count(user_id: str = Depends(get_current_user_id), db: Client = Depends(get_db)):
    count = await NotificationService(db).get_unread_count(user_id)
    return {"unread_count": count}
