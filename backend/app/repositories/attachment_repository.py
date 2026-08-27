from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.attachment import Attachment


class AttachmentRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, id: int) -> Attachment | None:
        statement = select(Attachment).where(Attachment.id == id)
        result = await self.db.execute(statement)
        return result.scalars().first()

    async def create(self, attachment: Attachment) -> Attachment:
        self.db.add(attachment)
        await self.db.commit()
        await self.db.refresh(attachment)
        return attachment

    async def list_all(self) -> list[Attachment]:
        statement = select(Attachment)
        result = await self.db.execute(statement)
        return list(result.scalars().all())

    async def get_by_notice_id(self, notice_id: int) -> list[Attachment]:
        statement = select(Attachment).where(Attachment.notice_id == notice_id)
        result = await self.db.execute(statement)
        return list(result.scalars().all())