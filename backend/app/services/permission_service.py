from sqlalchemy.ext.asyncio import AsyncSession

from app.repositories.admin_scope_repository import AdminScopeRepository
from app.repositories.org_unit_repository import OrgUnitRepository
from app.models.admin_scope import ScopeType
from app.models.org_unit import OrgUnit
from app.models.user import User


TRUSTED_POST_ROLES = ("super_admin", "corporate_super_admin", "corporate_admin")
TRUSTED_APPROVE_ROLES = ("super_admin", "corporate_super_admin")
SCOPED_APPROVE_ROLES = ("corporate_admin",)
RIGHTS_ELIGIBLE_ROLES = ("ict_sub_admin", "corporate_admin")


class PermissionService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.scope_repo = AdminScopeRepository(db)
        self.org_unit_repo = OrgUnitRepository(db)

    def has_right(self, user: User, flag_name: str) -> bool:
        if user.role.name == "super_admin":
            return True
        if user.role.name in RIGHTS_ELIGIBLE_ROLES:
            return bool(getattr(user, flag_name, False))
        return False

    async def _ancestor_ids(self, org_unit: OrgUnit) -> list[int]:
        ids: list[int] = []
        current = org_unit
        while current.parent_id is not None:
            parent = await self.org_unit_repo.get_by_id(current.parent_id)
            if parent is None:
                break
            ids.append(parent.id)
            current = parent
        return ids

    async def can_post_for(self, user: User, org_unit_id: int | None) -> bool:
        role_name = user.role.name
        if role_name in TRUSTED_POST_ROLES:
            return True
        if role_name == "ict_sub_admin":
            if not user.can_post:
                return False
            scoped_ids = await self.scope_repo.list_org_unit_ids(user.id, ScopeType.POST)
            if not scoped_ids:
                return True
            return org_unit_id is not None and org_unit_id in scoped_ids
        if role_name == "web_admin":
            if org_unit_id is None:
                return False
            scoped_ids = await self.scope_repo.list_org_unit_ids(user.id, ScopeType.POST)
            return org_unit_id in scoped_ids
        return False

    async def can_approve_for(self, user: User, org_unit_id: int | None) -> bool:
        role_name = user.role.name
        if role_name in TRUSTED_APPROVE_ROLES:
            return True
        if role_name == "ict_sub_admin":
            if not user.can_approve:
                return False
            scoped_ids = await self.scope_repo.list_org_unit_ids(user.id, ScopeType.APPROVE)
            if not scoped_ids:
                return True
            return org_unit_id is not None and await self._covers_with_cascade(scoped_ids, org_unit_id)
        if role_name in SCOPED_APPROVE_ROLES:
            scoped_ids = await self.scope_repo.list_org_unit_ids(user.id, ScopeType.APPROVE)
            return org_unit_id is not None and await self._covers_with_cascade(scoped_ids, org_unit_id)
        return False

    async def _covers_with_cascade(self, scoped_ids: list[int], org_unit_id: int) -> bool:
        if org_unit_id in scoped_ids:
            return True
        org_unit = await self.org_unit_repo.get_by_id(org_unit_id)
        if org_unit is None:
            return False
        ancestor_ids = await self._ancestor_ids(org_unit)
        return any(a_id in scoped_ids for a_id in ancestor_ids)