# app/routes/categories.py
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import require_roles, get_db
from app.services.category_service import CategoryService
from app.schemas.category_schema import CategoryCreate, CategoryRead
from app.models.user import User

router = APIRouter(prefix="/categories", tags=["categories"])


@router.post("/", response_model=CategoryRead)
async def create_category(
    data: CategoryCreate,
    current_user: User = Depends(require_roles("super_admin", "web_admin")),
    db: AsyncSession = Depends(get_db),
):
    service = CategoryService(db)
    return await service.create(data)


@router.get("/", response_model=list[CategoryRead])
async def list_categories(db: AsyncSession = Depends(get_db)):
    service = CategoryService(db)
    return await service.list_all()


@router.get("/{id}", response_model=CategoryRead)
async def get_category(id: int, db: AsyncSession = Depends(get_db)):
    service = CategoryService(db)
    return await service.get_by_id(id)
@router.patch("/{id}/reassign-notices")
async def reassign_category_notices(
    id: int,
    to_id: int,
    current_user: User = Depends(require_roles("super_admin")),
    db: AsyncSession = Depends(get_db),
):
    service = CategoryService(db)
    return await service.reassign_notices(id, to_id)


@router.delete("/{id}", status_code=204)
async def delete_category(
    id: int,
    current_user: User = Depends(require_roles("super_admin")),
    db: AsyncSession = Depends(get_db),
):
    service = CategoryService(db)
    await service.delete(current_user,id)