from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.deps import get_current_user, get_db
from app.services.permission_service import PermissionService
from app.models.role import Role
from app.schemas.role_schema import RoleRead
from app.models.user import User

router = APIRouter(prefix="/roles", tags=["roles"])


def _has_manage_users_right(user: User, permission_service: PermissionService) -> bool:
    if user.role.name == "super_admin":
        return True
    return permission_service.has_right(user, "can_manage_users")


@router.get("/", response_model=list[RoleRead])
async def list_roles(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    permission_service = PermissionService(db)
    if not _has_manage_users_right(current_user, permission_service):
        raise HTTPException(403, "You don't have permission to view roles")

    result = await db.execute(select(Role))
    return list(result.scalars().all())