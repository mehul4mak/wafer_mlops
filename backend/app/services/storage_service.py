from supabase import Client
from fastapi import HTTPException, UploadFile
from app.core.config import settings
import uuid
import io


ALLOWED_MIME_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB


class StorageService:
    def __init__(self, db: Client):
        self.db = db

    async def upload_receipt(self, file: UploadFile, user_id: str, group_id: str) -> str:
        content = await file.read()
        if len(content) > MAX_FILE_SIZE:
            raise HTTPException(status_code=413, detail="File too large (max 10 MB)")
        if file.content_type not in ALLOWED_MIME_TYPES:
            raise HTTPException(status_code=415, detail=f"Unsupported file type: {file.content_type}")

        ext = file.filename.rsplit(".", 1)[-1] if "." in (file.filename or "") else "jpg"
        path = f"receipts/{group_id}/{user_id}/{uuid.uuid4()}.{ext}"

        self.db.storage.from_(settings.STORAGE_BUCKET).upload(
            path, content, {"content-type": file.content_type}
        )
        public_url = self.db.storage.from_(settings.STORAGE_BUCKET).get_public_url(path)
        return public_url

    async def upload_proof(self, file: UploadFile, user_id: str, settlement_id: str) -> str:
        content = await file.read()
        if len(content) > MAX_FILE_SIZE:
            raise HTTPException(status_code=413, detail="File too large (max 10 MB)")
        if file.content_type not in ALLOWED_MIME_TYPES:
            raise HTTPException(status_code=415, detail=f"Unsupported file type: {file.content_type}")

        ext = file.filename.rsplit(".", 1)[-1] if "." in (file.filename or "") else "jpg"
        path = f"proofs/{settlement_id}/{user_id}/{uuid.uuid4()}.{ext}"

        self.db.storage.from_(settings.STORAGE_BUCKET).upload(
            path, content, {"content-type": file.content_type}
        )
        public_url = self.db.storage.from_(settings.STORAGE_BUCKET).get_public_url(path)

        self.db.table("payment_proofs").insert({
            "settlement_id": settlement_id,
            "uploaded_by": user_id,
            "file_url": public_url,
            "file_type": file.content_type,
        }).execute()

        return public_url

    async def upload_avatar(self, file: UploadFile, user_id: str) -> str:
        content = await file.read()
        if file.content_type not in {"image/jpeg", "image/png", "image/webp"}:
            raise HTTPException(status_code=415, detail="Only JPEG/PNG/WebP avatars allowed")

        ext = file.filename.rsplit(".", 1)[-1] if "." in (file.filename or "") else "jpg"
        path = f"avatars/{user_id}.{ext}"

        self.db.storage.from_(settings.STORAGE_BUCKET).upload(
            path, content, {"content-type": file.content_type, "upsert": "true"}
        )
        return self.db.storage.from_(settings.STORAGE_BUCKET).get_public_url(path)
