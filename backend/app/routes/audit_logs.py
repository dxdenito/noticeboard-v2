from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.client_ip import normalize_ip
from app.core.deps import require_roles, get_db
from app.core.limiter import limiter
from app.services.audit_log_service import AuditLogService
from app.services.audit_export_service import AuditExportService
from app.schemas.audit_log_schema import AuditLogRead, AuditLogMeta
from app.models.user import User

router = APIRouter(prefix="/audit-logs", tags=["audit-logs"])

VIEWER_ROLES = ("super_admin", "corporate_super_admin")
XLSX_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"


def parse_ip(value: str | None) -> str | None:
    if not value:
        return None
    normalized = normalize_ip(value)
    if normalized is None:
        raise HTTPException(400, "Enter a valid IPv4 or IPv6 address")
    return normalized


@router.get("/meta", response_model=AuditLogMeta)
async def get_audit_log_meta(
    current_user: User = Depends(require_roles(*VIEWER_ROLES)),
    db: AsyncSession = Depends(get_db),
):
    service = AuditLogService(db)
    return await service.get_filter_options()


@router.get("/export")
@limiter.limit("10/minute")
async def export_audit_logs(
    request: Request,
    actor_id: int | None = Query(default=None),
    target_type: str | None = Query(default=None),
    action: str | None = Query(default=None),
    search: str | None = Query(default=None, max_length=100),
    ip: str | None = Query(default=None, max_length=45),
    date_from: datetime | None = Query(default=None),
    date_to: datetime | None = Query(default=None),
    current_user: User = Depends(require_roles(*VIEWER_ROLES)),
    db: AsyncSession = Depends(get_db),
):
    ip_address = parse_ip(ip)
    export_service = AuditExportService(db)
    result = await export_service.build(
        current_user, actor_id, target_type, action, search, date_from, date_to, ip_address
    )

    log_service = AuditLogService(db)
    await log_service.log(
        current_user, "audit_log.export", "audit_log", None, "Audit log export",
        details=result["summary"],
    )

    return Response(
        content=result["content"],
        media_type=XLSX_TYPE,
        headers={
            "Content-Disposition": f'attachment; filename="{result["filename"]}"',
            "X-Content-Type-Options": "nosniff",
        },
    )


@router.get("/", response_model=list[AuditLogRead])
async def list_audit_logs(
    actor_id: int | None = Query(default=None),
    target_type: str | None = Query(default=None),
    action: str | None = Query(default=None),
    search: str | None = Query(default=None, max_length=100),
    ip: str | None = Query(default=None, max_length=45),
    date_from: datetime | None = Query(default=None),
    date_to: datetime | None = Query(default=None),
    limit: int = Query(default=50, le=200),
    offset: int = Query(default=0, ge=0),
    current_user: User = Depends(require_roles(*VIEWER_ROLES)),
    db: AsyncSession = Depends(get_db),
):
    service = AuditLogService(db)
    return await service.list_logs(
        actor_id, target_type, action, search, date_from, date_to, limit, offset,
        ip_address=parse_ip(ip),
    )