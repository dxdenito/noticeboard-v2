from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, update, delete as sql_delete
from fastapi import HTTPException

from app.repositories.org_unit_repository import OrgUnitRepository
from app.services.audit_log_service import AuditLogService, snapshot, format_changes
from app.services.permission_service import PermissionService
from app.models.org_unit import OrgUnit
from app.models.user import User
from app.models.notice import Notice
from app.models.event import Event
from app.models.admin_scope import AdminScope
from app.schemas.org_unit_schema import (
    OrgUnitCreate, OrgUnitUpdate, OrgUnitRead, OrgUnitTreeNode, OrgUnitUsage,
)


ORG_UNIT_AUDIT_FIELDS = ("name", "type", "parent_id", "head_title", "head_name")

class OrgUnitService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.org_unit_repo = OrgUnitRepository(db)
        self.audit_log_service = AuditLogService(db)
        self.permission_service = PermissionService(db)

    def _check_write_permission(self, current_user: User) -> None:
        if not self.permission_service.has_right(current_user, "can_manage_org_units"):
            raise HTTPException(403, "You don't have permission to manage org units")

    async def create(self, data: OrgUnitCreate, current_user: User) -> OrgUnit:
        self._check_write_permission(current_user)

        if data.parent_id is not None:
            parent = await self.org_unit_repo.get_by_id(data.parent_id)
            if not parent:
                raise HTTPException(404, "Parent org unit not found")

        org_unit = OrgUnit(**data.model_dump())
        created = await self.org_unit_repo.add(org_unit)

        await self.audit_log_service.log(
            current_user, "org_unit.create", "org_unit", created.id, created.name,
        )
        return created

    async def update(self, org_unit_id: int, data: OrgUnitUpdate, current_user: User) -> OrgUnit:
        self._check_write_permission(current_user)

        org_unit = await self.org_unit_repo.get_by_id(org_unit_id)
        if not org_unit:
            raise HTTPException(404, "Org unit not found")

        if data.parent_id is not None and data.parent_id != org_unit.parent_id:
            if data.parent_id == org_unit.id:
                raise HTTPException(400, "An org unit cannot be its own parent")
            new_parent = await self.org_unit_repo.get_by_id(data.parent_id)
            if not new_parent:
                raise HTTPException(404, "Parent org unit not found")
            if await self._creates_cycle(org_unit.id, new_parent):
                raise HTTPException(400, "This change would create a circular org structure")
        before = snapshot(org_unit, ORG_UNIT_AUDIT_FIELDS)

        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(org_unit, field, value)

        await self.org_unit_repo.add(org_unit)

        await self.audit_log_service.log(
            current_user, "org_unit.update", "org_unit", org_unit.id, org_unit.name,
            details=format_changes(before, snapshot(org_unit, ORG_UNIT_AUDIT_FIELDS)),
        )
        return org_unit

    async def _creates_cycle(self, moving_id: int, new_parent: OrgUnit) -> bool:
        current: OrgUnit | None = new_parent
        while current is not None:
            if current.id == moving_id:
                return True
            if current.parent_id is None:
                break
            current = await self.org_unit_repo.get_by_id(current.parent_id)
        return False

    async def _count(self, statement) -> int:
        result = await self.db.execute(statement)
        return result.scalar_one()

    async def _usage(self, org_unit_id: int) -> OrgUnitUsage:
        return OrgUnitUsage(
            users=await self._count(
                select(func.count(User.id)).where(User.org_unit_id == org_unit_id)
            ),
            notices=await self._count(
                select(func.count(Notice.id)).where(Notice.org_unit_id == org_unit_id)
            ),
            events=await self._count(
                select(func.count(Event.id)).where(Event.org_unit_id == org_unit_id)
            ),
            scopes=await self._count(
                select(func.count(AdminScope.id)).where(
                    AdminScope.org_unit_id == org_unit_id, AdminScope.revoked_at.is_(None)
                )
            ),
            children=await self._count(
                select(func.count(OrgUnit.id)).where(OrgUnit.parent_id == org_unit_id)
            ),
        )

    async def get_usage(self, org_unit_id: int, current_user: User) -> OrgUnitUsage:
        self._check_write_permission(current_user)
        org_unit = await self.org_unit_repo.get_by_id(org_unit_id)
        if not org_unit:
            raise HTTPException(404, "Org unit not found")
        return await self._usage(org_unit_id)

    async def delete(self, org_unit_id: int, current_user: User, reassign_to: int | None = None) -> None:
        self._check_write_permission(current_user)

        org_unit = await self.org_unit_repo.get_by_id(org_unit_id)
        if not org_unit:
            raise HTTPException(404, "Org unit not found")

        usage = await self._usage(org_unit_id)
        if usage.children:
            raise HTTPException(400, "Cannot delete an org unit that still has children")

        needs_reassign = usage.users + usage.notices + usage.events + usage.scopes > 0
        target: OrgUnit | None = None

        if needs_reassign:
            if reassign_to is None:
                raise HTTPException(
                    409,
                    "This org unit still has users, notices, events or scope grants. "
                    "Choose another org unit to move them to.",
                )
            if reassign_to == org_unit_id:
                raise HTTPException(400, "Choose a different org unit to move records to")
            target = await self.org_unit_repo.get_by_id(reassign_to)
            if not target:
                raise HTTPException(404, "Replacement org unit not found")

        name = org_unit.name

        if target is not None:
            await self.db.execute(
                update(User).where(User.org_unit_id == org_unit_id).values(org_unit_id=target.id)
            )
            await self.db.execute(
                update(Notice).where(Notice.org_unit_id == org_unit_id).values(org_unit_id=target.id)
            )
            await self.db.execute(
                update(Event).where(Event.org_unit_id == org_unit_id).values(org_unit_id=target.id)
            )

            existing_result = await self.db.execute(
                select(AdminScope.admin_id, AdminScope.scope_type).where(
                    AdminScope.org_unit_id == target.id, AdminScope.revoked_at.is_(None)
                )
            )
            existing_pairs = {(admin_id, scope_type) for admin_id, scope_type in existing_result.all()}

            active_result = await self.db.execute(
                select(AdminScope).where(
                    AdminScope.org_unit_id == org_unit_id, AdminScope.revoked_at.is_(None)
                )
            )
            for scope in active_result.scalars().all():
                if (scope.admin_id, scope.scope_type) in existing_pairs:
                    await self.db.delete(scope)
                else:
                    scope.org_unit_id = target.id

        await self.db.execute(
            sql_delete(AdminScope).where(
                AdminScope.org_unit_id == org_unit_id, AdminScope.revoked_at.is_not(None)
            )
        )

        await self.org_unit_repo.delete(org_unit)

        details = None
        if target is not None:
            details = (
                f"moved to {target.name}: {usage.users} users, {usage.notices} notices, "
                f"{usage.events} events, {usage.scopes} scope grants"
            )
        await self.audit_log_service.log(
            current_user, "org_unit.delete", "org_unit", org_unit_id, name, details=details,
        )

    async def get_by_id(self, org_unit_id: int) -> OrgUnit:
        org_unit = await self.org_unit_repo.get_by_id(org_unit_id)
        if not org_unit:
            raise HTTPException(404, "Org unit not found")
        return org_unit

    async def list_all(self, type_filter: str | None = None) -> list[OrgUnit]:
        return await self.org_unit_repo.list_all(type_filter)

    async def list_types(self) -> list[str]:
        return await self.org_unit_repo.list_distinct_types()

    async def get_tree(self) -> list[OrgUnitTreeNode]:
        all_units = await self.org_unit_repo.list_all()
        by_parent: dict[int | None, list[OrgUnit]] = {}
        for unit in all_units:
            by_parent.setdefault(unit.parent_id, []).append(unit)

        def build(unit: OrgUnit) -> OrgUnitTreeNode:
            base = OrgUnitRead.model_validate(unit)
            return OrgUnitTreeNode(
                **base.model_dump(),
                children=[build(child) for child in by_parent.get(unit.id, [])],
            )

        return [build(root) for root in by_parent.get(None, [])]