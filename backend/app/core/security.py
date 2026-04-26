from jose import jwt, JWTError
from app.core.config import settings


def verify_token(token: str) -> dict | None:
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET,
            algorithms=["HS256"],
            options={"verify_aud": False},
        )
        return payload
    except JWTError:
        return None


def get_user_id_from_token(token: str) -> str | None:
    payload = verify_token(token)
    if not payload:
        return None
    return payload.get("sub")
