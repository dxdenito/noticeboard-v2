from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from sqlalchemy import select, or_, and_
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
                selectinload(Notice.department),
                selectinload(Notice.club),
                selectinload(Notice.course),
            )
            .order_by(Notice.created_at.desc())
            .limit(limit)
            .offset(offset)
        )
        result = await self.db.execute(statement)
        return list(result.scalars().all())

    async def get_by_id(self,notice_id:int)->Notice|None:
        statement = select(Notice).where(Notice.id == notice_id).options(
                selectinload(Notice.department),
                selectinload(Notice.attachments),
                selectinload(Notice.club),
                selectinload(Notice.category),
                selectinload(Notice.course),
                selectinload(Notice.author)
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

    async def list_pending(
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
                    Notice.status == NoticeStatus.PENDING,
                    or_(*visibility_conditions),
                    or_(
                        Notice.expiry_date.is_(None),
                        Notice.expiry_date > datetime.now(timezone.utc),
                    ),
                )
                .options(
                    selectinload(Notice.attachments),
                    selectinload(Notice.category),
                    selectinload(Notice.author),
                    selectinload(Notice.department),
                    selectinload(Notice.club),
                    selectinload(Notice.course),
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

    async def list_by_course_id(self,course_id: int)-> list[Notice]:
        statement = (select(Notice).where(Notice.course_id == course_id))
        result = await self.db.execute(statement)
        return list(result.scalars().all())

    async def list_by_club_id(self,club_id: int)-> list[Notice]:
        statement = (select(Notice).where(Notice.club_id == club_id))
        result = await self.db.execute(statement)
        return list(result.scalars().all())

    async def list_by_department_id(self,department_id: int)-> list[Notice]:
        statement = (select(Notice).where(Notice.department_id == department_id))
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
                selectinload(Notice.department),
                selectinload(Notice.club),
                selectinload(Notice.course),
            )
            .order_by(Notice.created_at.desc())
            .limit(limit)
            .offset(offset)
        )
        result = await self.db.execute(statement)
        return list(result.scalars().all())
    async def list_by_author(self, author_id: int, limit: int = 50, offset: int = 0) -> list[Notice]:
        statement = (
            select(Notice)
            .where(Notice.author_id == author_id)
            .options(
                selectinload(Notice.attachments),
                selectinload(Notice.category),
                selectinload(Notice.author),
                selectinload(Notice.department),
                selectinload(Notice.club),
                selectinload(Notice.course),
            )
            .order_by(Notice.created_at.desc())
            .limit(limit)
            .offset(offset)
        )
        result = await self.db.execute(statement)
        return list(result.scalars().all())

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
