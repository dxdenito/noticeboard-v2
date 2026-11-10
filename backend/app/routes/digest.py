from fastapi import APIRouter, BackgroundTasks, Depends, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_db, require_roles
from app.core.limiter import limiter
from app.models.user import User
from app.schemas.digest_schema import (
    DigestSendRequest, DigestSettingsRead, DigestSettingsUpdate, DigestTestRequest,
)
from app.services.digest_service import DigestService

router = APIRouter(prefix="/digest", tags=["digest"])

SEND_ROLES = ("super_admin", "corporate_super_admin")
MANAGE_ROLES = ("super_admin",)


@router.get("/overview")
async def get_overview(
    current_user: User = Depends(require_roles(*SEND_ROLES)),
    db: AsyncSession = Depends(get_db),
):
    service = DigestService(db)
    return await service.overview()


@router.get("/settings", response_model=DigestSettingsRead)
async def get_settings_route(
    current_user: User = Depends(require_roles(*SEND_ROLES)),
    db: AsyncSession = Depends(get_db),
):
    service = DigestService(db)
    return await service.get_settings()


@router.patch("/settings", response_model=DigestSettingsRead)
async def update_settings_route(
    data: DigestSettingsUpdate,
    current_user: User = Depends(require_roles(*MANAGE_ROLES)),
    db: AsyncSession = Depends(get_db),
):
    service = DigestService(db)
    return await service.update_settings(data.model_dump(), current_user)


@router.get("/notices")
async def list_recent_notices(
    days: int = Query(default=30, ge=1, le=90),
    current_user: User = Depends(require_roles(*SEND_ROLES)),
    db: AsyncSession = Depends(get_db),
):
    service = DigestService(db)
    return await service.recent_notices(days)


@router.post("/preview")
async def preview_digest(
    data: DigestSendRequest,
    current_user: User = Depends(require_roles(*SEND_ROLES)),
    db: AsyncSession = Depends(get_db),
):
    service = DigestService(db)
    return await service.preview(data.kind, data.notice_ids, data.subject, data.intro, data.scope)


@router.post("/test")
@limiter.limit("10/minute")
async def send_test(
    request: Request,
    data: DigestTestRequest,
    current_user: User = Depends(require_roles(*SEND_ROLES)),
    db: AsyncSession = Depends(get_db),
):
    service = DigestService(db)
    await service.send_test(
        data.kind, data.notice_ids, data.subject, data.intro, data.audience, current_user
    )
    return {"message": f"Test email sent to {current_user.email}"}


@router.post("/send")
@limiter.limit("10/minute")
async def send_digest(
    request: Request,
    data: DigestSendRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(require_roles(*SEND_ROLES)),
    db: AsyncSession = Depends(get_db),
):
    service = DigestService(db)
    return await service.start_manual_run(
        data.kind, data.notice_ids, data.subject, data.intro, data.scope,
        current_user, background_tasks,
    )


@router.get("/runs")
async def list_runs(
    limit: int = Query(default=20, le=100),
    offset: int = Query(default=0, ge=0),
    current_user: User = Depends(require_roles(*SEND_ROLES)),
    db: AsyncSession = Depends(get_db),
):
    service = DigestService(db)
    return await service.list_runs(limit, offset)


@router.get("/runs/{run_id}")
async def get_run(
    run_id: int,
    current_user: User = Depends(require_roles(*SEND_ROLES)),
    db: AsyncSession = Depends(get_db),
):
    service = DigestService(db)
    return await service.get_run(run_id)