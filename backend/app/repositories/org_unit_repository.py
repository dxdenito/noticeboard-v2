from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.org_unit import OrgUnit


class OrgUnitRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, org_unit_id: int) -> OrgUnit | None:
        statement = select(OrgUnit).where(OrgUnit.id == org_unit_id)
        result = await self.db.execute(statement)
        return result.scalars().first()

    async def list_children(self, parent_id: int | None) -> list[OrgUnit]:
        statement = select(OrgUnit).where(OrgUnit.parent_id == parent_id)
        result = await self.db.execute(statement)
        return list(result.scalars().all())

    async def list_all(self) -> list[OrgUnit]:
        statement = select(OrgUnit)
        result = await self.db.execute(statement)
        return list(result.scalars().all())

    async def add(self, org_unit: OrgUnit) -> OrgUnit:
        self.db.add(org_unit)
        await self.db.commit()
        return org_unit