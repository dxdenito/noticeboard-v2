from datetime import datetime
from enum import Enum
from sqlalchemy.ext.asyncio import AsyncSession

from app.repositories.audit_log_repository import AuditLogRepository
from app.models.audit_log import AuditLog
from app.models.user import User

MAX_VALUE_LENGTH = 80


def _short(value) -> str:
    if value is None:
        return "none"
    if isinstance(value, Enum):
        value = value.value
    if isinstance(value, datetime):
        value = value.isoformat(timespec="minutes")
    text = str(value)
    if len(text) <= MAX_VALUE_LENGTH:
        return text
    return text[: MAX_VALUE_LENGTH - 1] + "…"


def snapshot(obj, fields: tuple[str, ...]) -> dict:
    return {field: getattr(obj, field, None) for field in fields}


def format_changes(before: dict, after: dict, hidden: tuple[str, ...] = ()) -> str | None:
    parts = []
    for field, old_value in before.items():
        new_value = after.get(field)
        if old_value == new_value:
            continue
        if field in hidden:
            parts.append(f"{field} changed")
        else:
            parts.append(f"{field}: {_short(old_value)} → {_short(new_value)}")
    return "; ".join(parts) if parts else None


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
        search: str | None = None,
        date_from: datetime | None = None,
        date_to: datetime | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> list[AuditLog]:
        return await self.log_repo.list_logs(
            actor_id, target_type, action, search, date_from, date_to, limit, offset
        )

    async def get_filter_options(self) -> dict:
        return {
            "actions": await self.log_repo.list_actions(),
            "target_types": await self.log_repo.list_target_types(),
            "actors": await self.log_repo.list_actors(),
        }