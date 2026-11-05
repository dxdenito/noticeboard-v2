from fastapi import APIRouter, Depends, UploadFile, File, Request, Response
from app.core.limiter import limiter
from app.schemas.import_schema import ImportResult

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user, get_db
from app.services.org_unit_service import OrgUnitService
from app.schemas.org_unit_schema import OrgUnitCreate, OrgUnitUpdate, OrgUnitRead, OrgUnitTreeNode, OrgUnitUsage
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
async def list_org_units(type: str | None = None, db: AsyncSession = Depends(get_db)):
    service = OrgUnitService(db)
    return await service.list_all(type)


@router.get("/tree", response_model=list[OrgUnitTreeNode])
async def get_org_unit_tree(db: AsyncSession = Depends(get_db)):
    service = OrgUnitService(db)
    return await service.get_tree()


@router.get("/types", response_model=list[str])
async def get_org_unit_types(db: AsyncSession = Depends(get_db)):
    service = OrgUnitService(db)
    return await service.list_types()

@router.get("/export")
async def export_org_units(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = OrgUnitService(db)
    content = await service.export_csv(current_user)
    return Response(
        content=content,
        media_type="text/csv; charset=utf-8",
        headers={
            "Content-Disposition": 'attachment; filename="org-units.csv"',
            "X-Content-Type-Options": "nosniff",
        },
    )


@router.post("/import", response_model=ImportResult)
@limiter.limit("20/minute")
async def import_org_units(
    request: Request,
    file: UploadFile = File(...),
    dry_run: bool = True,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = OrgUnitService(db)
    return await service.import_csv(file, current_user, dry_run)


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


@router.get("/{org_unit_id}/usage", response_model=OrgUnitUsage)
async def get_org_unit_usage(
    org_unit_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = OrgUnitService(db)
    return await service.get_usage(org_unit_id, current_user)


@router.delete("/{org_unit_id}", status_code=204)
async def delete_org_unit(
    org_unit_id: int,
    reassign_to: int | None = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = OrgUnitService(db)
    await service.delete(org_unit_id, current_user, reassign_to)