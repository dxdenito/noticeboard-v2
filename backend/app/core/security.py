import hashlib
from datetime import datetime, timedelta, timezone

import bcrypt # type: ignore
from jose import JWTError, jwt

from app.core.config import settings


def hash_password(password: str) -> str:
    sha = hashlib.sha256(password.encode("utf-8")).hexdigest()
    hashed = bcrypt.hashpw(sha.encode("utf-8"), bcrypt.gensalt())
    return hashed.decode("utf-8")


def verify_password(password: str, hashed_password: str) -> bool:
    sha = hashlib.sha256(password.encode("utf-8")).hexdigest()
    return bcrypt.checkpw(sha.encode("utf-8"), hashed_password.encode("utf-8"))


def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(
        minutes=settings.access_token_expire_minutes
    )
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.secret_key, algorithm=settings.algorithm)


def decode_access_token(token: str) -> dict | None:
    try:
        payload = jwt.decode(
            token, settings.secret_key, algorithms=[settings.algorithm]
        )
        return payload
    except JWTError:
        return None

def create_audience_token(audience_value: str, expire_hours: int = 24) -> str:
    to_encode = {
        "audience": audience_value,
        "type": "audience_verification",
        "exp": datetime.now(timezone.utc) + timedelta(hours=expire_hours),
    }
    return jwt.encode(to_encode, settings.secret_key, algorithm=settings.algorithm)

def create_activation_token(user_id: int, expire_days: int = 7) -> str:
    to_encode = {
        "sub": str(user_id),
        "type": "account_activation",
        "exp": datetime.now(timezone.utc) + timedelta(days=expire_days),
    }
    return jwt.encode(to_encode, settings.secret_key, algorithm=settings.algorithm)

def create_password_reset_token(user_id: int, expire_hours: int = 24) -> str:
    to_encode = {
        "sub": str(user_id),
        "type": "password_reset",
        "exp": datetime.now(timezone.utc) + timedelta(hours=expire_hours),
    }
    return jwt.encode(to_encode, settings.secret_key, algorithm=settings.algorithm)