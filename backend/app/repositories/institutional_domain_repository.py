from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.institutional_domain import InstitutionalDomain


class InstitutionalDomainRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, id: int) -> InstitutionalDomain | None:
        statement = select(InstitutionalDomain).where(InstitutionalDomain.id == id)
        result = await self.db.execute(statement)
        return result.scalars().first()

    async def get_by_domain(self, domain: str) -> InstitutionalDomain | None:
        statement = select(InstitutionalDomain).where(InstitutionalDomain.domain == domain)
        result = await self.db.execute(statement)
        return result.scalars().first()

    async def create(self, item: InstitutionalDomain) -> InstitutionalDomain:
        self.db.add(item)
        await self.db.commit()
        await self.db.refresh(item)
        return item

    async def list_all(self) -> list[InstitutionalDomain]:
        statement = select(InstitutionalDomain).order_by(InstitutionalDomain.domain)
        result = await self.db.execute(statement)
        return list(result.scalars().all())

    async def delete(self, item: InstitutionalDomain) -> None:
        await self.db.delete(item)
        await self.db.commit()