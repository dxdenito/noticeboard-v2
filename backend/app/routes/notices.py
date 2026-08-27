from sqlalchemy.ext.asyncio import AsyncSession

from fastapi import APIRouter, Depends
from app.schemas.notice_schema import NoticeRead, NoticeCreate
from app.models.user import User
from app.services.notice_service import NoticeService
from app.core.deps import get_db, get_current_user
from app.core.deps import get_viewer_audience
from app.models.notice import Audience



router = APIRouter(prefix="/notices", tags=["notices"])

@router.post("/", response_model=NoticeRead)
async def create_notice(
    data: NoticeCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    notice_service = NoticeService(db)
    return await notice_service.create(data, current_user)


@router.get("/", response_model=list[NoticeRead])
async def get_feed(
    limit: int = 50,
    offset: int = 0,
    viewer_audience: Audience | None = Depends(get_viewer_audience),
    db: AsyncSession = Depends(get_db),
):
    notice_service = NoticeService(db)
    return await notice_service.list_feed(viewer_audience, limit, offset)

@router.get("/pending", response_model=list[NoticeRead])
async def list_pending(limit: int = 50,
                       current_user: User = Depends(get_current_user),
    offset: int = 0,
    viewer_audience: Audience | None = Depends(get_viewer_audience),
    db: AsyncSession = Depends(get_db)
):
    notice_service = NoticeService(db)
    return await notice_service.list_pending(current_user,viewer_audience,limit,offset)
    
@router.patch("/{id}/approve", response_model=NoticeRead)
async def approve_notice(notice_id:int, current_user: User = Depends(get_current_user),db: AsyncSession = Depends(get_db)):
    noticeservice = NoticeService(db)
    return await noticeservice.approve(notice_id, current_user)

@router.patch("/{id}/reject", response_model=NoticeRead)
async def reject_notice(notice_id:int, current_user: User = Depends(get_current_user),db: AsyncSession = Depends(get_db)):
    noticeservice = NoticeService(db)
    return await noticeservice.reject(notice_id, current_user)

