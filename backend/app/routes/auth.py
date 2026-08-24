from fastapi import APIRouter, Depends, Response
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.services.auth_service import AuthService
from app.core.security import create_access_token

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
        secure=False,  # switch to True once you're on HTTPS in production
        samesite="lax",
        max_age=settings.access_token_expire_minutes * 60,
    )

    return {"message": "Logged in successfully"}


@router.post("/logout")
async def logout(response: Response):
    response.delete_cookie("access_token")
    return {"message": "Logged out successfully"}