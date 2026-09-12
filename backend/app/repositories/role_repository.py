from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.role import Role


class RoleRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, role_id: int) -> Role | None:
        statement = select(Role).where(Role.id == role_id)
        result = await self.db.execute(statement)
        return result.scalars().first()