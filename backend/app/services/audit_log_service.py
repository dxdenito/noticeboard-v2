from sqlalchemy.ext.asyncio import AsyncSession

from app.repositories.audit_log_repository import AuditLogRepository
from app.models.audit_log import AuditLog
from app.models.user import User


class AuditLogService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.log_repo = AuditLogRepository(db)

    async def log(
        self,
        actor: User | None,
        action: str,
        target_type: str,
        target_id: int | None = None,
        target_label: str | None = None,
        details: str | None = None,
    ) -> AuditLog:
        entry = AuditLog(
            actor_id=actor.id if actor is not None else None,
            action=action,
            target_type=target_type,
            target_id=target_id,
            target_label=target_label,
            details=details,
        )
        return await self.log_repo.add(entry)

    async def list_logs(
        self,
        actor_id: int | None = None,
        target_type: str | None = None,
        action: str | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> list[AuditLog]:
        return await self.log_repo.list_logs(actor_id, target_type, action, limit, offset)