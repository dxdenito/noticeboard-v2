from sqlalchemy.ext.asyncio import AsyncSession

from fastapi import APIRouter, Depends, BackgroundTasks, HTTPException
from app.schemas.event_schema import EventRead, EventCreate, EventUpdate, EventReject
from app.models.user import User
from app.models.notice import NoticeStatus
from app.services.event_service import EventService
from app.core.deps import get_db, get_current_user
from fastapi import UploadFile, File
from fastapi.responses import FileResponse

router = APIRouter(prefix="/events", tags=["events"])


@router.post("/", response_model=EventRead)
async def create_event(
    data: EventCreate,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = EventService(db)
    return await service.create(data, current_user, background_tasks)


@router.get("/upcoming", response_model=list[EventRead])
async def list_upcoming_events(
    limit: int = 50,
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
):
    service = EventService(db)
    return await service.list_upcoming(limit, offset)


@router.get("/pending", response_model=list[EventRead])
async def list_pending_events(
    limit: int = 50,
    offset: int = 0,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = EventService(db)
    return await service.list_pending(current_user, limit, offset)


@router.get("/pending/count")
async def count_pending_events(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = EventService(db)
    count = await service.count_pending(current_user)
    return {"count": count}


@router.get("/rejected", response_model=list[EventRead])
async def list_rejected_events(
    limit: int = 50,
    offset: int = 0,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = EventService(db)
    return await service.list_rejected(current_user, limit, offset)


@router.get("/mine", response_model=list[EventRead])
async def get_my_events(
    limit: int = 50,
    offset: int = 0,
    status: NoticeStatus | None = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = EventService(db)
    events = await service.list_my_events(current_user, limit, offset, status)
    return [EventRead.model_validate(e) for e in events]


@router.get("/manage", response_model=list[EventRead])
async def get_manage_events(
    limit: int = 50,
    offset: int = 0,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = EventService(db)
    events = await service.list_for_admin(current_user, limit, offset)
    return [EventRead.model_validate(e) for e in events]


@router.get("/all", response_model=list[EventRead])
async def get_all_events(
    limit: int = 50,
    offset: int = 0,
    search: str | None = None,
    status: NoticeStatus | None = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = EventService(db)
    events = await service.list_all_for_oversight(current_user, limit, offset, search, status)
    return [EventRead.model_validate(e) for e in events]


@router.patch("/{id}", response_model=EventRead)
async def update_event(
    id: int,
    data: EventUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = EventService(db)
    event = await service.update(id, data, current_user)
    return EventRead.model_validate(event)


@router.post("/{id}/image", response_model=EventRead)
async def upload_event_image(
    id: int,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = EventService(db)
    return await service.upload_image(id, file, current_user)

@router.delete("/{id}", status_code=204)
async def delete_event(
    id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = EventService(db)
    await service.delete(id, current_user)


@router.get("/{id}", response_model=EventRead)
async def get_event(
    id: int,
    db: AsyncSession = Depends(get_db),
):
    service = EventService(db)
    return await service.get_by_id(id)

@router.get("/{id}/image")
async def get_event_image(id: int, db: AsyncSession = Depends(get_db)):
    service = EventService(db)
    event = await service.get_by_id(id)
    if not event.image_url:
        raise HTTPException(404, "This event has no image")
    return FileResponse(path=event.image_url, filename=event.image_file_name)

@router.patch("/{id}/approve", response_model=EventRead)
async def approve_event(
    id: int,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = EventService(db)
    return await service.approve(id, current_user, background_tasks)


@router.patch("/{id}/reject", response_model=EventRead)
async def reject_event(
    id: int,
    data: EventReject,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = EventService(db)
    return await service.reject(id, data.rejection_notes, current_user, background_tasks)

@router.get("/mine/counts")
async def get_my_event_counts(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = EventService(db)
    return await service.count_my_events(current_user)