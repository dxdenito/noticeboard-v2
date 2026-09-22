from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from sqlalchemy import select, func, update
from app.models.notification import Notification


class NotificationRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, notification: Notification) -> Notification:
        self.db.add(notification)
        await self.db.commit()
        await self.db.refresh(notification)
        return notification

    async def get_by_id(self, id: int) -> Notification | None:
        statement = select(Notification).where(Notification.id == id)
        result = await self.db.execute(statement)
        return result.scalars().first()

    async def list_for_recipient(self, recipient_id: int, limit: int = 20, offset: int = 0) -> list[Notification]:
        statement = (
            select(Notification)
            .where(Notification.recipient_id == recipient_id)
            .order_by(Notification.created_at.desc())
            .limit(limit)
            .offset(offset)
        )
        result = await self.db.execute(statement)
        return list(result.scalars().all())

    async def count_unread(self, recipient_id: int) -> int:
        statement = select(func.count(Notification.id)).where(
            Notification.recipient_id == recipient_id, Notification.is_read == False
        )
        result = await self.db.execute(statement)
        return result.scalar_one()

    async def mark_read(self, notification: Notification) -> Notification:
        notification.is_read = True
        await self.db.commit()
        await self.db.refresh(notification)
        return notification

    async def mark_all_read(self, recipient_id: int) -> None:
        statement = (
            update(Notification)
            .where(Notification.recipient_id == recipient_id, Notification.is_read == False)
            .values(is_read=True)
        )
        await self.db.execute(statement)
        await self.db.commit()