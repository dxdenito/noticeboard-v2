from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.admin_scope import AdminScope, ScopeType


class AdminScopeRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def list_org_unit_ids(self, admin_id: int, scope_type: ScopeType) -> list[int]:
        statement = select(AdminScope.org_unit_id).where(
            AdminScope.admin_id == admin_id,
            AdminScope.scope_type == scope_type,
            AdminScope.revoked_at.is_(None),
        )
        result = await self.db.execute(statement)
        return list(result.scalars().all())

    async def get_active_scope(
        self, admin_id: int, org_unit_id: int, scope_type: ScopeType
    ) -> AdminScope | None:
        statement = select(AdminScope).where(
            AdminScope.admin_id == admin_id,
            AdminScope.org_unit_id == org_unit_id,
            AdminScope.scope_type == scope_type,
            AdminScope.revoked_at.is_(None),
        )
        result = await self.db.execute(statement)
        return result.scalars().first()

    async def add_scope(self, scope: AdminScope) -> AdminScope:
        self.db.add(scope)
        await self.db.commit()
        return scope

    async def revoke_scope(self, scope: AdminScope) -> None:
        scope.revoked_at = datetime.now(timezone.utc)
        await self.db.commit()