from sqlalchemy.ext.asyncio import AsyncSession

from fastapi import APIRouter, Depends
from app.schemas.notice_schema import NoticeRead, NoticeCreate,NoticeUpdate
from app.models.user import User
from app.services.notice_service import NoticeService
from app.core.deps import get_db, get_current_user, get_optional_current_user
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

@router.get("/mine", response_model=list[NoticeRead])
async def get_my_notices(
    limit: int = 50,
    offset: int = 0,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    notice_service = NoticeService(db)
    notices = await notice_service.list_my_notices(current_user, limit, offset)
    return [NoticeRead.model_validate(n) for n in notices]

@router.get("/manage", response_model=list[NoticeRead])
async def get_manage_notices(
    limit: int = 50,
    offset: int = 0,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    notice_service = NoticeService(db)
    notices = await notice_service.list_for_admin(current_user, limit, offset)
    return [NoticeRead.model_validate(n) for n in notices]

@router.get("/pinned-site", response_model=list[NoticeRead])
async def get_pinned_site_notices(
    limit: int = 10,
    db: AsyncSession = Depends(get_db),
):
    notice_service = NoticeService(db)
    notices = await notice_service.list_pinned_site(limit)
    return [NoticeRead.model_validate(n) for n in notices]

@router.patch("/{id}", response_model=NoticeRead)
async def update_notice(
    id: int,
    data: NoticeUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    notice_service = NoticeService(db)
    notice = await notice_service.update(id, data, current_user)
    return NoticeRead.model_validate(notice)


@router.delete("/{id}", status_code=204)
async def delete_notice(
    id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    notice_service = NoticeService(db)
    await notice_service.delete(id, current_user)

@router.get("/{id}", response_model=NoticeRead)
async def get_notice(
    id: int,
    viewer_audience: Audience | None = Depends(get_viewer_audience),
    current_user: User | None = Depends(get_optional_current_user),
    db: AsyncSession = Depends(get_db),
):
    notice_service = NoticeService(db)
    return await notice_service.get_by_id(id, viewer_audience, current_user)
        
@router.patch("/{id}/approve", response_model=NoticeRead)
async def approve_notice(id: int, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    noticeservice = NoticeService(db)
    return await noticeservice.approve(id, current_user)

@router.patch("/{id}/reject", response_model=NoticeRead)
async def reject_notice(id: int, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    noticeservice = NoticeService(db)
    return await noticeservice.reject(id, current_user)

@router.patch("/{id}/pin-site", response_model=NoticeRead)
async def pin_notice_site(
    id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    notice_service = NoticeService(db)
    return await notice_service.pin_site(id, current_user)


@router.patch("/{id}/unpin-site", response_model=NoticeRead)
async def unpin_notice_site(
    id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    notice_service = NoticeService(db)
    return await notice_service.unpin_site(id, current_user)


@router.patch("/{id}/pin-feed", response_model=NoticeRead)
async def pin_notice_feed(
    id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    notice_service = NoticeService(db)
    return await notice_service.pin_feed(id, current_user)


@router.patch("/{id}/unpin-feed", response_model=NoticeRead)
async def unpin_notice_feed(
    id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    notice_service = NoticeService(db)
    return await notice_service.unpin_feed(id, current_user)