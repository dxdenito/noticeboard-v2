from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status

from app.core.config import settings
from app.repositories.user_repository import UserRepository
from app.models.user import User
from app.schemas.user_schema import UserCreateByAdmin
from app.core.security import hash_password


class UserAdminService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.user_repo = UserRepository(db)

    async def create_user(self, data: UserCreateByAdmin) -> User:
        existing = await self.user_repo.get_by_email(data.email)
        if existing:
            raise HTTPException(400, "Email already registered")

        new_user = User(
            email=data.email,
            hashed_password=hash_password(data.password),
            full_name=data.full_name,
            role_id=data.role_id,
            requires_approval=data.requires_approval,
            is_active=True,
        )
        await self.user_repo.create_user(new_user)

        reloaded = await self.user_repo.get_by_email(data.email)
        if reloaded is None:
            raise HTTPException(500, "User creation failed unexpectedly")
        return reloaded
    