from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from sqlalchemy import select, or_, and_, func
from datetime import datetime, timezone
from app.models.notice import Notice, Audience, NoticeStatus

class NoticeRepository:
    def __init__(self, db: AsyncSession):
        self.db = db


    async def list_for_viewer(
        self, viewer_audience: Audience | None, limit: int = 50, offset: int = 0
    ) -> list[Notice]:
        visibility_conditions = [Notice.audience == Audience.PUBLIC]

        if viewer_audience == Audience.STUDENT:
            visibility_conditions.append(Notice.audience == Audience.STUDENT)
        elif viewer_audience == Audience.STAFF:
            visibility_conditions.append(Notice.audience == Audience.STUDENT)
            visibility_conditions.append(Notice.audience == Audience.STAFF)

        statement = (
            select(Notice)
            .where(
                Notice.status == NoticeStatus.APPROVED,
                or_(*visibility_conditions),
                or_(
                    Notice.expiry_date.is_(None),
                    Notice.expiry_date > datetime.now(timezone.utc),
                ),
            )
            .options(
                selectinload(Notice.category),
                selectinload(Notice.attachments),
                selectinload(Notice.author),
                selectinload(Notice.reviewed_by),
                selectinload(Notice.org_unit),
            )
            .order_by(Notice.created_at.desc())
            .limit(limit)
            .offset(offset)
        )
        result = await self.db.execute(statement)
        return list(result.scalars().all())

    async def get_by_id(self,notice_id:int)->Notice|None:
        statement = select(Notice).where(Notice.id == notice_id).options(
                selectinload(Notice.org_unit),
                selectinload(Notice.attachments),
                selectinload(Notice.category),
                selectinload(Notice.author),
                selectinload(Notice.reviewed_by),
            )
        result = await self.db.execute(statement)
        return result.scalars().first()

    async def create(self, notice:Notice)->Notice:
        self.db.add(notice)
        await self.db.commit()
        await self.db.refresh(notice)
        return notice
    async def update(self, notice: Notice) -> Notice:
        await self.db.commit()
        await self.db.refresh(notice)
        return notice

    async def list_pending(self, limit: int = 50, offset: int = 0) -> list[Notice]:
        statement = (
            select(Notice)
            .where(
                Notice.status == NoticeStatus.PENDING,
                or_(
                    Notice.expiry_date.is_(None),
                    Notice.expiry_date > datetime.now(timezone.utc),
                ),
            )
            .options(
                selectinload(Notice.attachments),
                selectinload(Notice.category),
                selectinload(Notice.author),
                selectinload(Notice.reviewed_by),
                selectinload(Notice.org_unit),
            )
            .order_by(Notice.created_at.asc())
            .limit(limit)
            .offset(offset)
        )
        result = await self.db.execute(statement)
        return list(result.scalars().all())

    async def list_rejected(self, limit: int = 50, offset: int = 0) -> list[Notice]:
        statement = (
            select(Notice)
            .where(
                Notice.status == NoticeStatus.REJECTED,
                or_(
                    Notice.expiry_date.is_(None),
                    Notice.expiry_date > datetime.now(timezone.utc),
                ),
            )
            .options(
                selectinload(Notice.attachments),
                selectinload(Notice.category),
                selectinload(Notice.author),
                selectinload(Notice.reviewed_by),
                selectinload(Notice.org_unit),
            )
            .order_by(Notice.created_at.asc())
            .limit(limit)
            .offset(offset)
        )
        result = await self.db.execute(statement)
        return list(result.scalars().all())


    async def list_by_category_id(self,category_id: int)-> list[Notice]:
        statement = (select(Notice).where(Notice.category_id == category_id))
        result = await self.db.execute(statement)
        return list(result.scalars().all())

    async def list_by_org_unit_id(self, org_unit_id: int) -> list[Notice]:
        statement = (select(Notice).where(Notice.org_unit_id == org_unit_id))
        result = await self.db.execute(statement)
        return list(result.scalars().all())

    async def list_all_approved(self, limit: int = 50, offset: int = 0) -> list[Notice]:
        statement = (
            select(Notice)
            .where(
                Notice.status == NoticeStatus.APPROVED,
                or_(
                    Notice.expiry_date.is_(None),
                    Notice.expiry_date > datetime.now(timezone.utc),
                ),
            )
            .options(
                selectinload(Notice.attachments),
                selectinload(Notice.category),
                selectinload(Notice.author),
                selectinload(Notice.reviewed_by),
                selectinload(Notice.org_unit),
            )
            .order_by(Notice.created_at.desc())
            .limit(limit)
            .offset(offset)
        )
        result = await self.db.execute(statement)
        return list(result.scalars().all())

    async def list_all(
        self, limit: int = 50, offset: int = 0, search: str | None = None, status: NoticeStatus | None = None
    ) -> list[Notice]:
        statement = (
            select(Notice)
            .options(
                selectinload(Notice.attachments),
                selectinload(Notice.category),
                selectinload(Notice.author),
                selectinload(Notice.reviewed_by),
                selectinload(Notice.org_unit),
            )
        )

        if search:
            statement = statement.where(Notice.title.ilike(f"%{search}%"))
        if status is not None:
            statement = statement.where(Notice.status == status)

        statement = statement.order_by(Notice.created_at.desc()).limit(limit).offset(offset)
        result = await self.db.execute(statement)
        return list(result.scalars().all())

    async def count_all(self) -> dict[str, int]:
        statement = select(Notice.status, func.count(Notice.id)).group_by(Notice.status)
        result = await self.db.execute(statement)
        counts = {status.value: 0 for status in NoticeStatus}
        for status, count in result.all():
            counts[status.value] = count
        counts["total"] = sum(counts[status.value] for status in NoticeStatus)
        return counts

    async def list_by_author(
        self, author_id: int, limit: int = 50, offset: int = 0, status: NoticeStatus | None = None
    ) -> list[Notice]:
        statement = select(Notice).where(Notice.author_id == author_id)

        if status is not None:
            statement = statement.where(Notice.status == status)

        statement = (
            statement
            .options(
                selectinload(Notice.attachments),
                selectinload(Notice.category),
                selectinload(Notice.author),
                selectinload(Notice.reviewed_by),
                selectinload(Notice.org_unit),
            )
            .order_by(Notice.created_at.desc())
            .limit(limit)
            .offset(offset)
        )
        result = await self.db.execute(statement)
        return list(result.scalars().all())

    async def count_by_author(self, author_id: int) -> dict[str, int]:
        statement = (
            select(Notice.status, func.count(Notice.id))
            .where(Notice.author_id == author_id)
            .group_by(Notice.status)
        )
        result = await self.db.execute(statement)
        counts = {status.value: 0 for status in NoticeStatus}
        for status, count in result.all():
            counts[status.value] = count
        counts["total"] = sum(counts[status.value] for status in NoticeStatus)
        return counts

    async def list_pinned_site(self, limit: int = 10) -> list[Notice]:
        statement = (
            select(Notice)
            .where(
                Notice.is_pinned_site == True,
                Notice.status == NoticeStatus.APPROVED,
                Notice.audience == Audience.PUBLIC,
            )
            .options(
                selectinload(Notice.category),
                selectinload(Notice.author),
                selectinload(Notice.attachments),
            )
            .order_by(Notice.created_at.desc())
            .limit(limit)
        )
        result = await self.db.execute(statement)
        return list(result.scalars().all())

    async def delete(self, notice: Notice) -> None:
        await self.db.delete(notice)
        await self.db.commit()