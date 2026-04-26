from pydantic_settings import BaseSettings
from typing import List
import os


class Settings(BaseSettings):
    APP_ENV: str = "development"
    CORS_ORIGINS: str = "http://localhost:3000,http://localhost:19006"

    SUPABASE_URL: str
    SUPABASE_SERVICE_KEY: str
    SUPABASE_ANON_KEY: str
    JWT_SECRET: str

    RESEND_API_KEY: str = ""
    FROM_EMAIL: str = "noreply@splitmate.app"

    SENTRY_DSN: str = ""
    STORAGE_BUCKET: str = "splitmate-files"

    @property
    def cors_origins_list(self) -> List[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",")]

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
