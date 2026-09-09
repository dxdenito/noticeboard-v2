from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user, get_db
from app.services.admin_scope_service import AdminScopeService
from app.schemas.scope_schema import ScopeSummary, ScopeAuditLogRead
from app.models.user import User

router = APIRouter(prefix="/users/{user_id}/scope", tags=["admin-scope"])


@router.post("/departments/{department_id}")
async def grant_department_scope(
    user_id: int,
    department_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = AdminScopeService(db)
    await service.grant_department(user_id, department_id, current_user)
    return {"message": "Department scope granted"}


@router.delete("/departments/{department_id}")
async def revoke_department_scope(
    user_id: int,
    department_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = AdminScopeService(db)
    await service.revoke_department(user_id, department_id, current_user)
    return {"message": "Department scope revoked"}


@router.post("/clubs/{club_id}")
async def grant_club_scope(
    user_id: int,
    club_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = AdminScopeService(db)
    await service.grant_club(user_id, club_id, current_user)
    return {"message": "Club scope granted"}


@router.delete("/clubs/{club_id}")
async def revoke_club_scope(
    user_id: int,
    club_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = AdminScopeService(db)
    await service.revoke_club(user_id, club_id, current_user)
    return {"message": "Club scope revoked"}


@router.get("/", response_model=ScopeSummary)
async def get_scope_summary(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = AdminScopeService(db)
    return await service.get_scope_summary(user_id)


@router.get("/logs", response_model=list[ScopeAuditLogRead])
async def get_scope_logs(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = AdminScopeService(db)
    logs = await service.list_logs(user_id)
    return [ScopeAuditLogRead.model_validate(log) for log in logs]