import hmac

from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, BackgroundTasks, status

from app.core.config import settings
from app.repositories.user_repository import UserRepository
from app.services.email_service import EmailService
from app.services.audit_log_service import AuditLogService
from app.models.user import User
from app.core.security import (
    verify_password, hash_password, create_password_reset_token,
    decode_access_token, password_fingerprint,
)


class AuthService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.user_repo = UserRepository(db)
        self.email_service = EmailService()
        self.audit_log_service = AuditLogService(db)

    async def _log_failed_login(self, email: str, user_id: int | None, reason: str, ip: str | None) -> None:
        details = f"{reason}; ip: {ip}" if ip else reason
        await self.audit_log_service.log(
            None, "auth.login_failed", "user", user_id, email, details=details,
        )

    async def authenticate(self, email: str, password: str, ip: str | None = None) -> User:
        email = email.strip().lower()
        user = await self.user_repo.get_by_email(email)
        if not user:
            await self._log_failed_login(email, None, "unknown email", ip)
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password",
                headers={"WWW-Authenticate": "Bearer"},
            )

        user_id = user.id
        user_email = user.email

        if not verify_password(password, user.hashed_password):
            await self._log_failed_login(user_email, user_id, "wrong password", ip)
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password",
                headers={"WWW-Authenticate": "Bearer"},
            )

        if not user.is_active:
            await self._log_failed_login(user_email, user_id, "account inactive", ip)
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Your account is inactive. If you haven't activated it yet, check your email — otherwise contact an administrator.",
            )

        await self.audit_log_service.log(
            user, "auth.login", "user", user_id, user_email,
            details=f"ip: {ip}" if ip else None,
        )
        return user

    async def forgot_password(self, email: str, background_tasks: BackgroundTasks) -> None:
        email = email.strip().lower()
        user = await self.user_repo.get_by_email(email)
        if user is not None and user.is_active:
            token = create_password_reset_token(user.id, user.hashed_password)
            reset_link = f"{settings.frontend_base_url}/reset-password?token={token}"
            background_tasks.add_task(
                self.email_service.send_password_reset_email, user.email, user.full_name, reset_link
            )
            await self.audit_log_service.log(
                None, "auth.password_reset_request", "user", user.id, user.email,
            )

    async def reset_password(self, token: str, new_password: str) -> User:
        invalid = HTTPException(400, "This reset link is invalid or has expired")

        payload = decode_access_token(token)
        if payload is None or payload.get("type") != "password_reset":
            raise invalid

        user = await self.user_repo.get_by_id(int(payload.get("sub")))
        if user is None or not user.is_active:
            raise invalid

        token_fingerprint = payload.get("pwd")
        if not token_fingerprint or not hmac.compare_digest(
            token_fingerprint, password_fingerprint(user.hashed_password)
        ):
            raise invalid

        user.hashed_password = hash_password(new_password)
        user.must_change_password = False
        updated = await self.user_repo.update(user)

        await self.audit_log_service.log(
            updated, "auth.password_reset", "user", updated.id, updated.email,
            details="password reset through email link",
        )
        return updated

    async def change_password(self, current_user: User, current_password: str, new_password: str) -> User:
        if not verify_password(current_password, current_user.hashed_password):
            raise HTTPException(400, "Current password is incorrect")

        current_user.hashed_password = hash_password(new_password)
        current_user.must_change_password = False
        updated = await self.user_repo.update(current_user)

        await self.audit_log_service.log(
            updated, "auth.password_change", "user", updated.id, updated.email,
        )
        return updated