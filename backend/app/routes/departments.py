# app/routes/departments.py
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import require_roles, get_db
from app.services.department_service import DepartmentService
from app.schemas.department_schema import DepartmentCreate, DepartmentRead
from app.models.user import User

router = APIRouter(prefix="/departments", tags=["departments"])


@router.post("/", response_model=DepartmentRead)
async def create_department(
    data: DepartmentCreate,
    current_user: User = Depends(require_roles("super_admin", "web_admin")),
    db: AsyncSession = Depends(get_db),
):
    service = DepartmentService(db)
    return await service.create(data)


@router.get("/", response_model=list[DepartmentRead])
async def list_departments(db: AsyncSession = Depends(get_db)):
    service = DepartmentService(db)
    return await service.list_all()


@router.get("/{id}", response_model=DepartmentRead)
async def get_department(id: int, db: AsyncSession = Depends(get_db)):
    service = DepartmentService(db)
    return await service.get_by_id(id)

@router.patch("/{id}/reassign-notices")
async def reassign_department_notices(
    id: int,
    to_id: int,
    current_user: User = Depends(require_roles("super_admin")),
    db: AsyncSession = Depends(get_db),
):
    service = DepartmentService(db)
    return await service.reassign_notices(id, to_id)


@router.delete("/{id}", status_code=204)
async def delete_department(
    id: int,
    current_user: User = Depends(require_roles("super_admin")),
    db: AsyncSession = Depends(get_db),
):
    service = DepartmentService(db)
    await service.delete(id)