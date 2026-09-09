from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.admin_scope import AdminDepartmentScope, AdminClubScope
from app.models.scope_audit_log import ScopeAuditLog, ScopeType, ScopeAction


class AdminScopeRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def list_department_ids(self, user_id: int) -> list[int]:
        statement = select(AdminDepartmentScope.department_id).where(AdminDepartmentScope.user_id == user_id)
        result = await self.db.execute(statement)
        return list(result.scalars().all())

    async def list_club_ids(self, user_id: int) -> list[int]:
        statement = select(AdminClubScope.club_id).where(AdminClubScope.user_id == user_id)
        result = await self.db.execute(statement)
        return list(result.scalars().all())

    async def get_department_scope(self, user_id: int, department_id: int) -> AdminDepartmentScope | None:
        statement = select(AdminDepartmentScope).where(
            AdminDepartmentScope.user_id == user_id,
            AdminDepartmentScope.department_id == department_id,
        )
        result = await self.db.execute(statement)
        return result.scalars().first()

    async def get_club_scope(self, user_id: int, club_id: int) -> AdminClubScope | None:
        statement = select(AdminClubScope).where(
            AdminClubScope.user_id == user_id,
            AdminClubScope.club_id == club_id,
        )
        result = await self.db.execute(statement)
        return result.scalars().first()

    async def add_department_scope(self, scope: AdminDepartmentScope) -> AdminDepartmentScope:
        self.db.add(scope)
        await self.db.commit()
        return scope

    async def remove_department_scope(self, scope: AdminDepartmentScope) -> None:
        await self.db.delete(scope)
        await self.db.commit()

    async def add_club_scope(self, scope: AdminClubScope) -> AdminClubScope:
        self.db.add(scope)
        await self.db.commit()
        return scope

    async def remove_club_scope(self, scope: AdminClubScope) -> None:
        await self.db.delete(scope)
        await self.db.commit()

    async def add_log(self, log: ScopeAuditLog) -> ScopeAuditLog:
        self.db.add(log)
        await self.db.commit()
        return log

    async def list_logs_for_user(self, user_id: int) -> list[ScopeAuditLog]:
        statement = (
            select(ScopeAuditLog)
            .where(ScopeAuditLog.user_id == user_id)
            .order_by(ScopeAuditLog.created_at.desc())
        )
        result = await self.db.execute(statement)
        return list(result.scalars().all())