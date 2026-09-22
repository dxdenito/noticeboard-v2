from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user, get_db
from app.services.institutional_domain_service import InstitutionalDomainService
from app.schemas.institutional_domain_schema import InstitutionalDomainCreate, InstitutionalDomainRead
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


@router.delete("/{id}", status_code=204)
async def delete_domain(
    id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = InstitutionalDomainService(db)
    await service.delete(id, current_user)