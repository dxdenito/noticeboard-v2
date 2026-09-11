from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException

from app.repositories.admin_scope_repository import AdminScopeRepository
from app.repositories.org_unit_repository import OrgUnitRepository
from app.services.audit_log_service import AuditLogService
from app.models.admin_scope import AdminScope, ScopeType
from app.models.user import User


class AdminScopeService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.scope_repo = AdminScopeRepository(db)
        self.org_unit_repo = OrgUnitRepository(db)
        self.audit_log_service = AuditLogService(db)

    def _check_grant_permission(self, performed_by: User, scope_type: ScopeType) -> None:
        role_name = performed_by.role.name
        if scope_type == ScopeType.POST:
            if role_name != "super_admin":
                raise HTTPException(403, "Only super_admin can grant post scopes")
        elif scope_type == ScopeType.APPROVE:
            if role_name not in ("super_admin", "corporate_super_admin"):
                raise HTTPException(403, "Only super_admin or corporate_super_admin can grant approve scopes")

    async def grant_scope(
        self, admin_id: int, org_unit_id: int, scope_type: ScopeType, performed_by: User
    ) -> AdminScope:
        self._check_grant_permission(performed_by, scope_type)

        org_unit = await self.org_unit_repo.get_by_id(org_unit_id)
        if not org_unit:
            raise HTTPException(404, "Org unit not found")

        existing = await self.scope_repo.get_active_scope(admin_id, org_unit_id, scope_type)
        if existing:
            raise HTTPException(400, "Scope already granted")

        scope = AdminScope(
            admin_id=admin_id,
            org_unit_id=org_unit_id,
            scope_type=scope_type,
            granted_by_id=performed_by.id,
        )
        created = await self.scope_repo.add_scope(scope)

        await self.audit_log_service.log(
            performed_by, f"scope.grant.{scope_type.value}", "org_unit", org_unit.id, org_unit.name,
            details=f"granted to admin_id={admin_id}",
        )
        return created

    async def revoke_scope(
        self, admin_id: int, org_unit_id: int, scope_type: ScopeType, performed_by: User
    ) -> None:
        self._check_grant_permission(performed_by, scope_type)

        scope = await self.scope_repo.get_active_scope(admin_id, org_unit_id, scope_type)
        if not scope:
            raise HTTPException(404, "Scope not found")

        org_unit = await self.org_unit_repo.get_by_id(org_unit_id)
        org_unit_name = org_unit.name if org_unit else None

        await self.scope_repo.revoke_scope(scope)

        await self.audit_log_service.log(
            performed_by, f"scope.revoke.{scope_type.value}", "org_unit", org_unit_id, org_unit_name,
            details=f"revoked from admin_id={admin_id}",
        )

    async def get_scope_summary(self, admin_id: int) -> dict:
        post_ids = await self.scope_repo.list_org_unit_ids(admin_id, ScopeType.POST)
        approve_ids = await self.scope_repo.list_org_unit_ids(admin_id, ScopeType.APPROVE)
        return {"post_org_unit_ids": post_ids, "approve_org_unit_ids": approve_ids}