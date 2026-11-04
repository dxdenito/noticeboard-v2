import os
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, UploadFile

from app.repositories.attachment_repository import AttachmentRepository
from app.repositories.notice_repository import NoticeRepository
from app.models.attachment import Attachment
from app.models.user import User
from app.core.file_storage import save_upload_file
from app.core.config import settings
from app.services.audit_log_service import AuditLogService

import fitz  # type: ignore[import-untyped]


class AttachmentService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.attachment_repo = AttachmentRepository(db)
        self.notice_repo = NoticeRepository(db)
        self.audit_log_service = AuditLogService(db)

    async def upload(self, notice_id: int, file: UploadFile, current_user: User) -> Attachment:
        notice = await self.notice_repo.get_by_id(notice_id)
        if not notice:
            raise HTTPException(404, "Notice not found")

        if current_user.role.name != "super_admin" and notice.author_id != current_user.id:
            raise HTTPException(403, "Only the notice's author or a super_admin can add attachments")

        notice_title = notice.title
        file_path, file_size = await save_upload_file(file, subfolder=f"notices/{notice_id}")

        new_attachment = Attachment(
            notice_id=notice_id,
            file_name=file.filename or "unnamed",
            file_url=file_path,
            file_size=file_size,
            content_type=file.content_type,
        )
        created = await self.attachment_repo.create(new_attachment)

        await self.audit_log_service.log(
            current_user, "attachment.upload", "attachment", created.id, created.file_name,
            details=f"notice: {notice_title} (#{notice_id}); {file_size} bytes",
        )
        return created

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
    
    async def delete(self, attachment_id: int, current_user: User) -> None:
        attachment = await self.attachment_repo.get_by_id(attachment_id)
        if not attachment:
            raise HTTPException(404, "Attachment not found")

        notice = await self.notice_repo.get_by_id(attachment.notice_id)
        if not notice:
            raise HTTPException(404, "Notice not found")

        if current_user.role.name != "super_admin" and notice.author_id != current_user.id:
            raise HTTPException(403, "Only the notice's author or a super_admin can remove attachments")

        file_name = attachment.file_name
        attachment_id_for_log = attachment.id
        notice_title = notice.title
        notice_id_for_log = notice.id

        if os.path.exists(attachment.file_url):
            os.remove(attachment.file_url)

        await self.attachment_repo.delete(attachment)

        await self.audit_log_service.log(
            current_user, "attachment.delete", "attachment", attachment_id_for_log, file_name,
            details=f"notice: {notice_title} (#{notice_id_for_log})",
        )