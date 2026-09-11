from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user, get_db
from app.services.org_unit_service import OrgUnitService
from app.schemas.org_unit_schema import OrgUnitCreate, OrgUnitUpdate, OrgUnitRead, OrgUnitTreeNode
from app.models.user import User

router = APIRouter(prefix="/org-units", tags=["org-units"])


@router.post("/", response_model=OrgUnitRead)
async def create_org_unit(
    data: OrgUnitCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = OrgUnitService(db)
    return await service.create(data, current_user)


@router.get("/", response_model=list[OrgUnitRead])
async def list_org_units(db: AsyncSession = Depends(get_db)):
    service = OrgUnitService(db)
    return await service.list_all()


@router.get("/tree", response_model=list[OrgUnitTreeNode])
async def get_org_unit_tree(db: AsyncSession = Depends(get_db)):
    service = OrgUnitService(db)
    return await service.get_tree()


@router.get("/{org_unit_id}", response_model=OrgUnitRead)
async def get_org_unit(org_unit_id: int, db: AsyncSession = Depends(get_db)):
    service = OrgUnitService(db)
    return await service.get_by_id(org_unit_id)


@router.patch("/{org_unit_id}", response_model=OrgUnitRead)
async def update_org_unit(
    org_unit_id: int,
    data: OrgUnitUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = OrgUnitService(db)
    return await service.update(org_unit_id, data, current_user)


@router.delete("/{org_unit_id}", status_code=204)
async def delete_org_unit(
    org_unit_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = OrgUnitService(db)
    await service.delete(org_unit_id, current_user)