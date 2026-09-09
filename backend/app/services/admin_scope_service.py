from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException

from app.repositories.admin_scope_repository import AdminScopeRepository
from app.repositories.department_repository import DepartmentRepository
from app.repositories.club_repository import ClubRepository
from app.models.admin_scope import AdminDepartmentScope, AdminClubScope
from app.models.scope_audit_log import ScopeAuditLog, ScopeType, ScopeAction
from app.models.user import User


class AdminScopeService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.scope_repo = AdminScopeRepository(db)
        self.department_repo = DepartmentRepository(db)
        self.club_repo = ClubRepository(db)

    async def grant_department(
        self, user_id: int, department_id: int, performed_by: User
    ) -> None:
        # TODO:
        # 1. permission check: performed_by.role.name must be "super_admin", else 403
        # 2. fetch the department via self.department_repo.get_by_id — 404 if missing
        # 3. check it's not already granted (self.scope_repo.get_department_scope) — 400 if so
        # 4. create AdminDepartmentScope(user_id=..., department_id=...), add_department_scope
        # 5. create a ScopeAuditLog(user_id=..., scope_type=ScopeType.DEPARTMENT,
        #    scope_id=department_id, scope_name=department.name,
        #    action=ScopeAction.GRANTED, performed_by_id=performed_by.id), add_log
        if performed_by.role.name != "super_admin":
            raise HTTPException(403, "Only super_admin can grant department scopes")

        department = await self.department_repo.get_by_id(department_id)
        if not department:
            raise HTTPException(404, "Department not found")

        if await self.scope_repo.get_department_scope(user_id, department_id):
            raise HTTPException(400, "Department scope already granted")

        statement = AdminDepartmentScope(user_id=user_id, department_id=department_id)
        await self.scope_repo.add_department_scope(statement)
        audit_log = ScopeAuditLog(
            user_id=user_id,
            scope_type=ScopeType.DEPARTMENT,
            scope_id=department_id,
            scope_name=department.name,
            action=ScopeAction.GRANTED,
            performed_by_id=performed_by.id,
        )
        await self.scope_repo.add_log(audit_log)

    async def revoke_department(
        self, user_id: int, department_id: int, performed_by: User
    ) -> None:
        # Same shape as grant, but: 404 if the scope doesn't exist (not "already granted"),
        # remove_department_scope instead of add, action=ScopeAction.REVOKED
        if performed_by.role.name != "super_admin":
            raise HTTPException(403, "Only super_admin can grant department scopes")

        department = await self.department_repo.get_by_id(department_id)
        if not department:
            raise HTTPException(404, "Department not found")

        scope = await self.scope_repo.get_department_scope(user_id, department_id)
        if not scope:
            raise HTTPException(404, "Department scope not found")

        await self.scope_repo.remove_department_scope(scope)
        audit_log = ScopeAuditLog(
            user_id=user_id,
            scope_type=ScopeType.DEPARTMENT,
            scope_id=department_id,
            scope_name=department.name,
            action=ScopeAction.REVOKED,
            performed_by_id=performed_by.id,
        )
        await self.scope_repo.add_log(audit_log)

    async def grant_club(self, user_id: int, club_id: int, performed_by: User) -> None:
        # Mirror grant_department, swap Department -> Club
        if performed_by.role.name != "super_admin":
            raise HTTPException(403, "Only super_admin can grant department scopes")

        club = await self.club_repo.get_by_id(club_id)
        if not club:
            raise HTTPException(404, "Club not found")

        if await self.scope_repo.get_club_scope(user_id, club_id):
            raise HTTPException(400, "Club scope already granted")

        scope = AdminClubScope(user_id=user_id, club_id=club_id)
        await self.scope_repo.add_club_scope(scope)
        audit_log = ScopeAuditLog(
            user_id=user_id,
            scope_type=ScopeType.CLUB,
            scope_id=club_id,
            scope_name=club.name,
            action=ScopeAction.GRANTED,
            performed_by_id=performed_by.id,
        )
        await self.scope_repo.add_log(audit_log)
        

    async def revoke_club(self, user_id: int, club_id: int, performed_by: User) -> None:
        # Mirror revoke_department, swap Department -> Club
        if performed_by.role.name != "super_admin":
            raise HTTPException(403, "Only super_admin can grant department scopes")

        club = await self.club_repo.get_by_id(club_id)
        if not club:
            raise HTTPException(404, "Club not found")

        scope = await self.scope_repo.get_club_scope(user_id, club_id)
        if not scope:
            raise HTTPException(404, "Club scope not found")

        await self.scope_repo.remove_club_scope(scope)
        audit_log = ScopeAuditLog(
            user_id=user_id,
            scope_type=ScopeType.CLUB,
            scope_id=club_id,
            scope_name=club.name,
            action=ScopeAction.REVOKED,
            performed_by_id=performed_by.id,
        )
        await self.scope_repo.add_log(audit_log)
        

    async def get_scope_summary(self, user_id: int) -> dict:
        # TODO: return {"department_ids": [...], "club_ids": [...]}
        # via scope_repo.list_department_ids / list_club_ids
        department_ids = await self.scope_repo.list_department_ids(user_id)
        club_ids = await self.scope_repo.list_club_ids(user_id)
        return {"department_ids": department_ids, "club_ids": club_ids}

    async def list_logs(self, user_id: int) -> list[ScopeAuditLog]:
        # TODO: return await self.scope_repo.list_logs_for_user(user_id)
        return list(await self.scope_repo.list_logs_for_user(user_id))
