from fastapi import Depends, HTTPException, status, Cookie
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.security import decode_access_token
from app.models.user import User
from app.repositories.user_repository import UserRepository
from fastapi import Cookie
from app.core.security import decode_access_token
from app.models.notice import Audience

async def get_current_user(
    access_token: str | None = Cookie(default=None),
    db: AsyncSession = Depends(get_db),
) -> User:
    credentials_exception = HTTPException(
        status_code=401,
        detail="Could not validate credentials",
    )

    if access_token is None:
        raise credentials_exception

    payload = decode_access_token(access_token)
    if payload is None:
        raise credentials_exception

    user_email: str | None = payload.get("sub")
    if user_email is None:
        raise credentials_exception

    user_repo = UserRepository(db)
    user = await user_repo.get_by_email(user_email)

    if user is None:
        raise credentials_exception
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is disabled")

    return user


def require_roles(*allowed_roles: str):
    async def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role.name not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have permission to perform this action",
            )
        return current_user
    return role_checker



async def get_viewer_audience(
    audience_token: str | None = Cookie(default=None),
) -> Audience | None:
    if audience_token is None:
        return None

    payload = decode_access_token(audience_token)
    if payload is None:
        return None

    # critical: reject anything that isn't actually an audience token —
    # this is what stops an admin session cookie (or a forged token) from
    # being misread as an audience claim
    if payload.get("type") != "audience_verification":
        return None

    audience_value = payload.get("audience")
    try:
        return Audience(audience_value)
    except (ValueError, TypeError):
        return None
    
async def get_optional_current_user(
    access_token: str | None = Cookie(default=None),
    db: AsyncSession = Depends(get_db),
) -> User | None:
    if access_token is None:
        return None
    payload = decode_access_token(access_token)
    if payload is None:
        return None
    user_email: str | None = payload.get("sub")
    if user_email is None:
        return None
    user_repo = UserRepository(db)
    return await user_repo.get_by_email(user_email)