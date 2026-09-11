from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from sqlalchemy import select
from app.models.audit_log import AuditLog


class AuditLogRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def add(self, log: AuditLog) -> AuditLog:
        self.db.add(log)
        await self.db.commit()
        return log

    async def list_logs(
        self,
        actor_id: int | None = None,
        target_type: str | None = None,
        action: str | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> list[AuditLog]:
        statement = select(AuditLog).options(selectinload(AuditLog.actor))

        if actor_id is not None:
            statement = statement.where(AuditLog.actor_id == actor_id)
        if target_type is not None:
            statement = statement.where(AuditLog.target_type == target_type)
        if action is not None:
            statement = statement.where(AuditLog.action == action)

        statement = statement.order_by(AuditLog.created_at.desc()).limit(limit).offset(offset)
        result = await self.db.execute(statement)
        return list(result.scalars().all())