from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException

from app.repositories.admin_scope_repository import AdminScopeRepository
from app.repositories.org_unit_repository import OrgUnitRepository
from app.repositories.user_repository import UserRepository
from app.services.audit_log_service import AuditLogService
from app.services.permission_service import PermissionService
from app.models.admin_scope import AdminScope, ScopeType
from app.models.user import User


class AdminScopeService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.scope_repo = AdminScopeRepository(db)
        self.org_unit_repo = OrgUnitRepository(db)
        self.user_repo = UserRepository(db)
        self.audit_log_service = AuditLogService(db)
        self.permission_service = PermissionService(db)

    async def _check_grant_permission(self, performed_by: User, target_admin_id: int, scope_type: ScopeType) -> None:
        if performed_by.id == target_admin_id and performed_by.role.name != "super_admin":
            raise HTTPException(403, "You cannot grant or revoke your own scope")

        role_name = performed_by.role.name

        if role_name == "corporate_super_admin":
            target_user = await self.user_repo.get_by_id(target_admin_id)
            if target_user is None or target_user.role.name != "corporate_admin":
                raise HTTPException(403, "corporate_super_admin can only assign scope to corporate_admin accounts")
            return

        if scope_type == ScopeType.POST:
            allowed = role_name == "super_admin" or self.permission_service.has_right(performed_by, "can_assign_post_scope")
            if not allowed:
                raise HTTPException(403, "You don't have permission to grant post scopes")
        elif scope_type == ScopeType.APPROVE:
            allowed = role_name == "super_admin" or self.permission_service.has_right(performed_by, "can_assign_approve_scope")
            if not allowed:
                raise HTTPException(403, "You don't have permission to grant approve scopes")

    async def grant_scope(
        self, admin_id: int, org_unit_id: int, scope_type: ScopeType, performed_by: User
    ) -> AdminScope:
        await self._check_grant_permission(performed_by, admin_id, scope_type)

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
        await self._check_grant_permission(performed_by, admin_id, scope_type)

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