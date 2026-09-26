from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from sqlalchemy import select, or_, and_
from datetime import datetime, timezone
from app.models.event import Event
from app.models.notice import NoticeStatus


class EventRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    def _with_relations(self, statement):
        return statement.options(
            selectinload(Event.author),
            selectinload(Event.reviewed_by),
            selectinload(Event.org_unit),
        )

    async def get_by_id(self, event_id: int) -> Event | None:
        statement = self._with_relations(select(Event).where(Event.id == event_id))
        result = await self.db.execute(statement)
        return result.scalars().first()

    async def create(self, event: Event) -> Event:
        self.db.add(event)
        await self.db.commit()
        await self.db.refresh(event)
        return event

    async def update(self, event: Event) -> Event:
        await self.db.commit()
        await self.db.refresh(event)
        return event

    async def delete(self, event: Event) -> None:
        await self.db.delete(event)
        await self.db.commit()

    async def list_upcoming(self, limit: int = 50, offset: int = 0) -> list[Event]:
        now = datetime.now(timezone.utc)
        statement = self._with_relations(
            select(Event)
            .where(
                Event.status == NoticeStatus.APPROVED,
                or_(
                    Event.end_date >= now,
                    and_(Event.end_date.is_(None), Event.start_date >= now),
                ),
            )
            .order_by(Event.start_date.asc())
            .limit(limit)
            .offset(offset)
        )
        result = await self.db.execute(statement)
        return list(result.scalars().all())

    async def list_pending(self, limit: int = 50, offset: int = 0) -> list[Event]:
        statement = self._with_relations(
            select(Event)
            .where(Event.status == NoticeStatus.PENDING)
            .order_by(Event.created_at.asc())
            .limit(limit)
            .offset(offset)
        )
        result = await self.db.execute(statement)
        return list(result.scalars().all())

    async def list_rejected(self, limit: int = 50, offset: int = 0) -> list[Event]:
        statement = self._with_relations(
            select(Event)
            .where(Event.status == NoticeStatus.REJECTED)
            .order_by(Event.created_at.asc())
            .limit(limit)
            .offset(offset)
        )
        result = await self.db.execute(statement)
        return list(result.scalars().all())

    async def list_all_approved(self, limit: int = 50, offset: int = 0) -> list[Event]:
        statement = self._with_relations(
            select(Event)
            .where(Event.status == NoticeStatus.APPROVED)
            .order_by(Event.start_date.desc())
            .limit(limit)
            .offset(offset)
        )
        result = await self.db.execute(statement)
        return list(result.scalars().all())

    async def list_by_author(self, author_id: int, limit: int = 50, offset: int = 0, status: NoticeStatus | None = None) -> list[Event]:
        statement = select(Event).where(Event.author_id == author_id)
        if status is not None:
            statement = statement.where(Event.status == status)
        statement = self._with_relations(statement.order_by(Event.created_at.desc()).limit(limit).offset(offset))
        result = await self.db.execute(statement)
        return list(result.scalars().all())

    async def list_all(self, limit: int = 50, offset: int = 0, search: str | None = None, status: NoticeStatus | None = None) -> list[Event]:
        statement = select(Event)
        if search:
            statement = statement.where(Event.title.ilike(f"%{search}%"))
        if status is not None:
            statement = statement.where(Event.status == status)
        statement = self._with_relations(statement.order_by(Event.created_at.desc()).limit(limit).offset(offset))
        result = await self.db.execute(statement)
        return list(result.scalars().all())

    async def count_by_author(self, author_id: int) -> dict[str, int]:
        from sqlalchemy import func
        statement = (
            select(Event.status, func.count(Event.id))
            .where(Event.author_id == author_id)
            .group_by(Event.status)
        )
        result = await self.db.execute(statement)
        counts = {status.value: 0 for status in NoticeStatus}
        for status, count in result.all():
            counts[status.value] = count
        counts["total"] = sum(counts[status.value] for status in NoticeStatus)
        return counts