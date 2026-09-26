from fastapi import APIRouter, Depends, Response, BackgroundTasks
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_user
from app.services.auth_service import AuthService
from app.core.security import create_access_token
from app.models.user import User
from app.schemas.user_schema import ForgotPasswordRequest, ResetPasswordRequest, ChangePasswordRequest

from app.core.config import settings

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login")
async def login(
    response: Response,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db),
):
    auth_service = AuthService(db)
    user = await auth_service.authenticate(form_data.username, form_data.password)

    access_token = create_access_token(data={"sub": user.email})

    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=settings.cross_origin_cookies,
        samesite="none" if settings.cross_origin_cookies else "lax",
        max_age=settings.access_token_expire_minutes * 60,
    )

    return {"message": "Logged in successfully", "must_change_password": user.must_change_password}


@router.post("/logout")
async def logout(response: Response):
    response.delete_cookie("access_token")
    return {"message": "Logged out successfully"}


@router.post("/forgot-password")
async def forgot_password(
    data: ForgotPasswordRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    auth_service = AuthService(db)
    await auth_service.forgot_password(data.email, background_tasks)
    return {"message": "If that email is registered, a reset link has been sent."}


@router.post("/reset-password")
async def reset_password(data: ResetPasswordRequest, db: AsyncSession = Depends(get_db)):
    auth_service = AuthService(db)
    await auth_service.reset_password(data.token, data.new_password)
    return {"message": "Password reset successfully"}


@router.post("/change-password")
async def change_password(
    data: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    auth_service = AuthService(db)
    await auth_service.change_password(current_user, data.current_password, data.new_password)
    return {"message": "Password changed successfully"}