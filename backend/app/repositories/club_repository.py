# app/repositories/club_repository.py
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.club import Club


class ClubRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, id: int) -> Club | None:
        statement = select(Club).where(Club.id == id)
        result = await self.db.execute(statement)
        return result.scalars().first()

    async def create(self, club: Club) -> Club:
        self.db.add(club)
        await self.db.commit()
        await self.db.refresh(club)
        return club

    async def list_all(self) -> list[Club]:
        statement = select(Club)
        result = await self.db.execute(statement)
        return list(result.scalars().all())
    async def delete(self, club: Club) -> None:
        await self.db.delete(club)
        await self.db.commit()
