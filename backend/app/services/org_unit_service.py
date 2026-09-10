from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException

from app.repositories.org_unit_repository import OrgUnitRepository
from app.models.org_unit import OrgUnit
from app.schemas.org_unit_schema import OrgUnitCreate, OrgUnitUpdate, OrgUnitTreeNode
from app.models.user import User


class OrgUnitService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.org_unit_repo = OrgUnitRepository(db)

    def _check_write_permission(self, current_user: User) -> None:
        if current_user.role.name != "super_admin":
            raise HTTPException(403, "Only super_admin can manage org units")

    async def create(self, data: OrgUnitCreate, current_user: User) -> OrgUnit:
        self._check_write_permission(current_user)

        if data.parent_id is not None:
            parent = await self.org_unit_repo.get_by_id(data.parent_id)
            if not parent:
                raise HTTPException(404, "Parent org unit not found")

        org_unit = OrgUnit(**data.model_dump())
        return await self.org_unit_repo.add(org_unit)

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

        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(org_unit, field, value)

        await self.org_unit_repo.add(org_unit)
        return org_unit

    async def _creates_cycle(self, moving_id: int, new_parent: OrgUnit) -> bool:
        current = new_parent
        while current is not None:
            if current.id == moving_id:
                return True
            if current.parent_id is None:
                break
            current = await self.org_unit_repo.get_by_id(current.parent_id)
        return False

    async def delete(self, org_unit_id: int, current_user: User) -> None:
        self._check_write_permission(current_user)

        org_unit = await self.org_unit_repo.get_by_id(org_unit_id)
        if not org_unit:
            raise HTTPException(404, "Org unit not found")

        children = await self.org_unit_repo.list_children(org_unit_id)
        if children:
            raise HTTPException(400, "Cannot delete an org unit that still has children")

        await self.org_unit_repo.delete(org_unit)

    async def get_by_id(self, org_unit_id: int) -> OrgUnit:
        org_unit = await self.org_unit_repo.get_by_id(org_unit_id)
        if not org_unit:
            raise HTTPException(404, "Org unit not found")
        return org_unit

    async def list_all(self) -> list[OrgUnit]:
        return await self.org_unit_repo.list_all()

    async def get_tree(self) -> list[OrgUnitTreeNode]:
        all_units = await self.org_unit_repo.list_all()
        by_parent: dict[int | None, list[OrgUnit]] = {}
        for unit in all_units:
            by_parent.setdefault(unit.parent_id, []).append(unit)

        def build(unit: OrgUnit) -> OrgUnitTreeNode:
            node = OrgUnitTreeNode.model_validate(unit)
            node.children = [build(child) for child in by_parent.get(unit.id, [])]
            return node

        return [build(root) for root in by_parent.get(None, [])]