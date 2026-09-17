import os
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, UploadFile

from app.repositories.attachment_repository import AttachmentRepository
from app.repositories.notice_repository import NoticeRepository
from app.models.attachment import Attachment
from app.models.user import User
from app.core.file_storage import save_upload_file
from app.core.config import settings

import fitz  # type: ignore[import-untyped]


class AttachmentService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.attachment_repo = AttachmentRepository(db)
        self.notice_repo = NoticeRepository(db)

    async def upload(self, notice_id: int, file: UploadFile, current_user: User) -> Attachment:
        notice = await self.notice_repo.get_by_id(notice_id)
        if not notice:
            raise HTTPException(404, "Notice not found")

        if current_user.role.name != "super_admin" and notice.author_id != current_user.id:
            raise HTTPException(403, "Only the notice's author or a super_admin can add attachments")

        file_path, file_size = await save_upload_file(file, subfolder=f"notices/{notice_id}")

        new_attachment = Attachment(
            notice_id=notice_id,
            file_name=file.filename or "unnamed",
            file_url=file_path,
            file_size=file_size,
            content_type=file.content_type,
        )
        return await self.attachment_repo.create(new_attachment)

    async def list_for_notice(self, notice_id: int) -> list[Attachment]:
        return await self.attachment_repo.get_by_notice_id(notice_id)

    def get_thumbnail_path(self, attachment: Attachment) -> str | None:
        if attachment.content_type != "application/pdf":
            return None

        thumb_dir = os.path.join(settings.UPLOAD_DIR, "thumbnails")
        os.makedirs(thumb_dir, exist_ok=True)
        thumb_path = os.path.join(thumb_dir, f"{attachment.id}.png")

        if os.path.exists(thumb_path):
            return thumb_path

        try:
            doc = fitz.open(attachment.file_url)
            page = doc.load_page(0)
            pix = page.get_pixmap(matrix=fitz.Matrix(1.5, 1.5))
            pix.save(thumb_path)
            doc.close()
        except Exception:
            return None

        return thumb_path