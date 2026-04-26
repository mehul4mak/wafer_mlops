from fastapi import APIRouter, Depends, UploadFile, File
from supabase import Client
from app.core.dependencies import get_current_user_id, get_db
from app.services.auth_service import AuthService
from app.services.storage_service import StorageService
from app.schemas.auth import (
    RegisterRequest, LoginRequest, TokenResponse,
    ProfileResponse, ProfileUpdate, RefreshRequest,
)

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post("/register", response_model=TokenResponse, status_code=201)
async def register(req: RegisterRequest, db: Client = Depends(get_db)):
    return await AuthService(db).register(req)


@router.post("/login", response_model=TokenResponse)
async def login(req: LoginRequest, db: Client = Depends(get_db)):
    return await AuthService(db).login(req)


@router.post("/refresh", response_model=TokenResponse)
async def refresh(req: RefreshRequest, db: Client = Depends(get_db)):
    return await AuthService(db).refresh(req.refresh_token)


@router.get("/me", response_model=ProfileResponse)
async def get_me(user_id: str = Depends(get_current_user_id), db: Client = Depends(get_db)):
    return await AuthService(db).get_profile(user_id)


@router.patch("/me", response_model=ProfileResponse)
async def update_me(req: ProfileUpdate, user_id: str = Depends(get_current_user_id), db: Client = Depends(get_db)):
    return await AuthService(db).update_profile(user_id, req)


@router.post("/me/avatar", response_model=dict)
async def upload_avatar(
    file: UploadFile = File(...),
    user_id: str = Depends(get_current_user_id),
    db: Client = Depends(get_db),
):
    url = await StorageService(db).upload_avatar(file, user_id)
    await AuthService(db).update_profile(user_id, ProfileUpdate(avatar_url=url))
    return {"avatar_url": url}
