from fastapi import APIRouter, Depends, UploadFile, File, Request, Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user, get_db
from app.core.limiter import limiter
from app.services.institutional_domain_service import InstitutionalDomainService
from app.schemas.institutional_domain_schema import InstitutionalDomainCreate, InstitutionalDomainRead
from app.schemas.import_schema import ImportResult
from app.models.user import User

router = APIRouter(prefix="/institutional-domains", tags=["institutional-domains"])


@router.post("/", response_model=InstitutionalDomainRead)
async def create_domain(
    data: InstitutionalDomainCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = InstitutionalDomainService(db)
    return await service.create(data, current_user)


@router.get("/", response_model=list[InstitutionalDomainRead])
async def list_domains(db: AsyncSession = Depends(get_db)):
    service = InstitutionalDomainService(db)
    return await service.list_all()


@router.get("/export")
async def export_domains(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = InstitutionalDomainService(db)
    content = await service.export_csv(current_user)
    return Response(
        content=content,
        media_type="text/csv; charset=utf-8",
        headers={
            "Content-Disposition": 'attachment; filename="institutional-domains.csv"',
            "X-Content-Type-Options": "nosniff",
        },
    )


@router.post("/import", response_model=ImportResult)
@limiter.limit("20/minute")
async def import_domains(
    request: Request,
    file: UploadFile = File(...),
    dry_run: bool = True,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = InstitutionalDomainService(db)
    return await service.import_csv(file, current_user, dry_run)


@router.delete("/{id}", status_code=204)
async def delete_domain(
    id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = InstitutionalDomainService(db)
    await service.delete(id, current_user)