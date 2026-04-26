from fastapi import APIRouter
from app.api.v1 import auth, groups, expenses, settlements, tasks, notifications, dashboard

api_router = APIRouter(prefix="/api/v1")

api_router.include_router(auth.router)
api_router.include_router(groups.router)
api_router.include_router(expenses.router)
api_router.include_router(settlements.router)
api_router.include_router(tasks.router)
api_router.include_router(notifications.router)
api_router.include_router(dashboard.router)
