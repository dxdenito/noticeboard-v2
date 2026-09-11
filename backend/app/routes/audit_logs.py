from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import require_roles, get_db
from app.services.audit_log_service import AuditLogService
from app.schemas.audit_log_schema import AuditLogRead
from app.models.user import User

router = APIRouter(prefix="/audit-logs", tags=["audit-logs"])


@router.get("/", response_model=list[AuditLogRead])
async def list_audit_logs(
    actor_id: int | None = Query(default=None),
    target_type: str | None = Query(default=None),
    action: str | None = Query(default=None),
    limit: int = Query(default=50, le=200),
    offset: int = Query(default=0),
    current_user: User = Depends(require_roles("super_admin", "corporate_super_admin")),
    db: AsyncSession = Depends(get_db),
):
    service = AuditLogService(db)
    return await service.list_logs(actor_id, target_type, action, limit, offset)