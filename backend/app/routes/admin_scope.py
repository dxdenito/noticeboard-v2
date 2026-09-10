from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user, get_db
from app.services.admin_scope_service import AdminScopeService
from app.schemas.scope_schema import ScopeSummary
from app.models.admin_scope import ScopeType
from app.models.user import User

router = APIRouter(prefix="/users/{user_id}/scope", tags=["admin-scope"])


@router.post("/{scope_type}/{org_unit_id}")
async def grant_scope(
    user_id: int,
    scope_type: ScopeType,
    org_unit_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = AdminScopeService(db)
    await service.grant_scope(user_id, org_unit_id, scope_type, current_user)
    return {"message": "Scope granted"}


@router.delete("/{scope_type}/{org_unit_id}")
async def revoke_scope(
    user_id: int,
    scope_type: ScopeType,
    org_unit_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = AdminScopeService(db)
    await service.revoke_scope(user_id, org_unit_id, scope_type, current_user)
    return {"message": "Scope revoked"}


@router.get("/", response_model=ScopeSummary)
async def get_scope_summary(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = AdminScopeService(db)
    return await service.get_scope_summary(user_id)