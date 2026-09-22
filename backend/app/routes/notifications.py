from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user, get_db
from app.repositories.notification_repository import NotificationRepository
from app.schemas.notification_schema import NotificationRead
from app.models.user import User

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("/", response_model=list[NotificationRead])
async def list_notifications(
    limit: int = 20,
    offset: int = 0,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    repo = NotificationRepository(db)
    return await repo.list_for_recipient(current_user.id, limit, offset)


@router.get("/unread-count")
async def unread_count(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    repo = NotificationRepository(db)
    count = await repo.count_unread(current_user.id)
    return {"count": count}


@router.patch("/{id}/read", response_model=NotificationRead)
async def mark_notification_read(
    id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    repo = NotificationRepository(db)
    notification = await repo.get_by_id(id)
    if not notification:
        raise HTTPException(404, "Notification not found")
    if notification.recipient_id != current_user.id:
        raise HTTPException(403, "This notification doesn't belong to you")
    return await repo.mark_read(notification)


@router.patch("/mark-all-read")
async def mark_all_read(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    repo = NotificationRepository(db)
    await repo.mark_all_read(current_user.id)
    return {"status": "ok"}