from sqlalchemy.ext.asyncio import AsyncSession
from app.services.user_admin_service import UserAdminService
from app.schemas.user_schema import UserCreateByAdmin
from app.core.deps import require_roles
from fastapi import APIRouter, Depends
from app.schemas.user_schema import UserRead
from app.core.deps import get_db, get_current_user
from app.models.user import User
from app.repositories.user_repository import UserRepository



router = APIRouter(prefix="/users", tags=["users"])

@router.get("/me", response_model=UserRead)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user

@router.post("/", response_model=UserRead)
async def create_user(
    data: UserCreateByAdmin,
    current_user: User = Depends(require_roles("super_admin")),
    db: AsyncSession = Depends(get_db),
):
    service = UserAdminService(db)
    return await service.create_user(data)

@router.get("/", response_model=list[UserRead])
async def list_users(
    limit: int = 50,
    offset: int = 0,
    current_user: User = Depends(require_roles("super_admin")),
    db: AsyncSession = Depends(get_db),
):
    user_repo = UserRepository(db)
    return await user_repo.list_users(limit, offset)