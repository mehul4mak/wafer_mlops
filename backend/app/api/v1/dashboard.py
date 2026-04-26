from fastapi import APIRouter, Depends
from supabase import Client
from app.core.dependencies import get_current_user_id, get_db
from app.services.dashboard_service import DashboardService
from app.schemas.dashboard import DashboardResponse

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("", response_model=DashboardResponse)
async def get_dashboard(user_id: str = Depends(get_current_user_id), db: Client = Depends(get_db)):
    return await DashboardService(db).get_dashboard(user_id)
