from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, BackgroundTasks, status

from app.core.config import settings
from app.repositories.user_repository import UserRepository
from app.services.email_service import EmailService
from app.models.user import User
from app.core.security import (
    verify_password, hash_password, create_password_reset_token, decode_access_token,
)


class AuthService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.user_repo = UserRepository(db)
        self.email_service = EmailService()

    async def authenticate(self, email: str, password: str) -> User:
        user = await self.user_repo.get_by_email(email)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password",
                headers={"WWW-Authenticate": "Bearer"},
            )

        if not verify_password(password, user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password",
                headers={"WWW-Authenticate": "Bearer"},
            )

        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Your account is inactive. If you haven't activated it yet, check your email — otherwise contact an administrator.",
            )

        return user

    async def forgot_password(self, email: str, background_tasks: BackgroundTasks) -> None:
        email = email.strip().lower()
        user = await self.user_repo.get_by_email(email)
        if user is not None and user.is_active:
            token = create_password_reset_token(user.id)
            reset_link = f"{settings.frontend_base_url}/reset-password?token={token}"
            background_tasks.add_task(
                self.email_service.send_password_reset_email, user.email, user.full_name, reset_link
            )
        # Always returns silently regardless of whether the email matched —
        # confirming or denying an account's existence here is an information leak.

    async def reset_password(self, token: str, new_password: str) -> User:
        payload = decode_access_token(token)
        if payload is None or payload.get("type") != "password_reset":
            raise HTTPException(400, "This reset link is invalid or has expired")

        user_id = payload.get("sub")
        user = await self.user_repo.get_by_id(int(user_id))
        if user is None:
            raise HTTPException(404, "Account not found")

        user.hashed_password = hash_password(new_password)
        user.must_change_password = False
        return await self.user_repo.update(user)

    async def change_password(self, current_user: User, current_password: str, new_password: str) -> User:
        if not verify_password(current_password, current_user.hashed_password):
            raise HTTPException(400, "Current password is incorrect")

        current_user.hashed_password = hash_password(new_password)
        current_user.must_change_password = False
        return await self.user_repo.update(current_user)