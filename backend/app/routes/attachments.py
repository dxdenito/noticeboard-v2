from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user, get_db
from app.services.attachment_service import AttachmentService
from app.repositories.attachment_repository import AttachmentRepository
from app.schemas.attachment_schema import AttachmentRead
from app.models.user import User
from app.core.deps import get_optional_current_user, get_viewer_audience
from app.services.notice_service import NoticeService
from app.models.notice import Audience

router = APIRouter(prefix="/notices/{notice_id}/attachments", tags=["attachments"])


@router.post("/", response_model=AttachmentRead)
async def upload_attachment(
    notice_id: int,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = AttachmentService(db)
    return await service.upload(notice_id, file, current_user)


@router.get("/", response_model=list[AttachmentRead])
async def list_attachments(notice_id: int, db: AsyncSession = Depends(get_db)):
    service = AttachmentService(db)
    return await service.list_for_notice(notice_id)


# Separate router for the download-by-attachment-id endpoint, since it's
# not nested under a notice_id in the URL.
download_router = APIRouter(prefix="/attachments", tags=["attachments"])




@download_router.get("/{id}/download")
async def download_attachment(
    id: int,
    current_user: User | None = Depends(get_optional_current_user),
    viewer_audience: Audience | None = Depends(get_viewer_audience),
    db: AsyncSession = Depends(get_db),
):
    attachment_repo = AttachmentRepository(db)
    attachment = await attachment_repo.get_by_id(id)
    if not attachment:
        raise HTTPException(404, "Attachment not found")

    notice_service = NoticeService(db)
    allowed = await notice_service.can_access_notice(attachment.notice_id, current_user, viewer_audience)
    if not allowed:
        raise HTTPException(404, "Attachment not found")

    return FileResponse(
        path=attachment.file_url,
        filename=attachment.file_name,
        media_type=attachment.content_type,
    )