from supabase import Client
from app.schemas.auth import RegisterRequest, LoginRequest, TokenResponse, ProfileResponse, ProfileUpdate
from fastapi import HTTPException, status


class AuthService:
    def __init__(self, db: Client):
        self.db = db

    async def register(self, req: RegisterRequest) -> TokenResponse:
        try:
            res = self.db.auth.sign_up({
                "email": req.email,
                "password": req.password,
                "options": {"data": {"full_name": req.full_name}},
            })
        except Exception as e:
            raise HTTPException(status_code=400, detail=str(e))

        if not res.session:
            raise HTTPException(status_code=400, detail="Registration failed – check your email for confirmation.")

        return TokenResponse(
            access_token=res.session.access_token,
            expires_in=res.session.expires_in,
            refresh_token=res.session.refresh_token,
            user_id=res.user.id,
        )

    async def login(self, req: LoginRequest) -> TokenResponse:
        try:
            res = self.db.auth.sign_in_with_password({"email": req.email, "password": req.password})
        except Exception as e:
            raise HTTPException(status_code=401, detail="Invalid credentials")

        return TokenResponse(
            access_token=res.session.access_token,
            expires_in=res.session.expires_in,
            refresh_token=res.session.refresh_token,
            user_id=res.user.id,
        )

    async def refresh(self, refresh_token: str) -> TokenResponse:
        try:
            res = self.db.auth.refresh_session(refresh_token)
        except Exception:
            raise HTTPException(status_code=401, detail="Invalid refresh token")

        return TokenResponse(
            access_token=res.session.access_token,
            expires_in=res.session.expires_in,
            refresh_token=res.session.refresh_token,
            user_id=res.user.id,
        )

    async def get_profile(self, user_id: str) -> ProfileResponse:
        res = self.db.table("profiles").select("*").eq("id", user_id).single().execute()
        if not res.data:
            raise HTTPException(status_code=404, detail="Profile not found")
        return ProfileResponse(**res.data)

    async def update_profile(self, user_id: str, req: ProfileUpdate) -> ProfileResponse:
        update_data = req.model_dump(exclude_none=True)
        if not update_data:
            return await self.get_profile(user_id)

        res = self.db.table("profiles").update(update_data).eq("id", user_id).execute()
        if not res.data:
            raise HTTPException(status_code=400, detail="Update failed")
        return ProfileResponse(**res.data[0])
