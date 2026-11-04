from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from sqlalchemy import select, or_
from app.models.audit_log import AuditLog
from app.models.user import User


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
        search: str | None = None,
        date_from: datetime | None = None,
        date_to: datetime | None = None,
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
        if date_from is not None:
            statement = statement.where(AuditLog.created_at >= date_from)
        if date_to is not None:
            statement = statement.where(AuditLog.created_at < date_to)
        if search:
            pattern = f"%{search}%"
            statement = statement.outerjoin(User, AuditLog.actor_id == User.id).where(
                or_(
                    AuditLog.target_label.ilike(pattern),
                    AuditLog.details.ilike(pattern),
                    AuditLog.action.ilike(pattern),
                    User.full_name.ilike(pattern),
                )
            )

        statement = statement.order_by(AuditLog.created_at.desc(), AuditLog.id.desc())
        statement = statement.limit(limit).offset(offset)
        result = await self.db.execute(statement)
        return list(result.scalars().all())

    async def list_actions(self) -> list[str]:
        result = await self.db.execute(select(AuditLog.action).distinct().order_by(AuditLog.action))
        return list(result.scalars().all())

    async def list_target_types(self) -> list[str]:
        result = await self.db.execute(
            select(AuditLog.target_type).distinct().order_by(AuditLog.target_type)
        )
        return list(result.scalars().all())

    async def list_actors(self) -> list[User]:
        actor_ids = select(AuditLog.actor_id).where(AuditLog.actor_id.is_not(None)).distinct()
        result = await self.db.execute(
            select(User).where(User.id.in_(actor_ids)).order_by(User.full_name)
        )
        return list(result.scalars().all())