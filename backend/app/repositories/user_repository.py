from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, func
from sqlalchemy.orm import selectinload, joinedload
from app.models.user import User
from app.models.role import Role


class UserRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, id: int) -> User | None:
        statement = select(User).options(selectinload(User.role)).where(User.id == id)
        result = await self.db.execute(statement)
        return result.scalars().first()

    async def get_by_email(self, email: str) -> User | None:
        statement = (
            select(User).options(selectinload(User.role)).where(User.email == email)
        )
        result = await self.db.execute(statement)
        return result.scalar_one_or_none()

    async def create_user(self, user: User) -> User:
        self.db.add(user)
        await self.db.commit()
        await self.db.refresh(user)
        return user

    async def update(self, user: User) -> User:
        await self.db.commit()
        await self.db.refresh(user)
        return user

    async def list_users(self, limit: int = 50, offset: int = 0, search: str | None = None) -> list[User]:
        statement = select(User).options(selectinload(User.role))

        if search:
            like_pattern = f"%{search}%"
            statement = statement.where(
                or_(
                    User.full_name.ilike(like_pattern),
                    User.email.ilike(like_pattern),
                )
            )

        statement = statement.offset(offset).limit(limit)
        result = await self.db.execute(statement)
        return list(result.scalars().all())

    async def list_by_role_name(self, role_name: str, limit: int = 50, offset: int = 0, search: str | None = None) -> list[User]:
        statement = (
            select(User)
            .join(User.role)
            .options(selectinload(User.role))
            .where(Role.name == role_name)
        )

        if search:
            like_pattern = f"%{search}%"
            statement = statement.where(
                or_(
                    User.full_name.ilike(like_pattern),
                    User.email.ilike(like_pattern),
                )
            )

        statement = statement.offset(offset).limit(limit)
        result = await self.db.execute(statement)
        return list(result.scalars().all())