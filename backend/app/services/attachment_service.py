from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, UploadFile

from app.repositories.attachment_repository import AttachmentRepository
from app.repositories.notice_repository import NoticeRepository
from app.models.attachment import Attachment
from app.models.user import User
from app.core.file_storage import save_upload_file


class AttachmentService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.attachment_repo = AttachmentRepository(db)
        self.notice_repo = NoticeRepository(db)

    async def upload(self, notice_id: int, file: UploadFile, current_user: User) -> Attachment:
        notice = await self.notice_repo.get_by_id(notice_id)
        if not notice:
            raise HTTPException(404, "Notice not found")

        if current_user.role.role != "admin" and notice.author_id != current_user.id:
            raise HTTPException(403, "Only the notice's author or an admin can add attachments")

        file_path, file_size = await save_upload_file(file, subfolder=f"notices/{notice_id}")

        new_attachment = Attachment(
            notice_id=notice_id,
            file_name=file.filename or "unnamed",
            file_url=file_path,
            file_size=file_size,
            content_type=file.content_type,
        )
        return await self.attachment_repo.create(new_attachment)