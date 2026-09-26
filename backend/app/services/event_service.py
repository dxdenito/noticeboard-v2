from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, BackgroundTasks, BackgroundTasks
from datetime import datetime, timezone

from app.repositories.event_repository import EventRepository
from app.services.permission_service import PermissionService
from app.services.audit_log_service import AuditLogService
from app.services.notification_service import NotificationService
from app.models.event import Event
from app.models.notice import NoticeStatus
from app.models.user import User
from app.schemas.event_schema import EventCreate, EventUpdate
from fastapi import UploadFile
from app.core.file_storage import save_upload_file

ADMIN_ROLES = ("super_admin", "ict_sub_admin", "corporate_super_admin", "corporate_admin", "web_admin")
AUTO_PUBLISH_ROLES = ("super_admin", "corporate_super_admin")


class EventService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.event_repo = EventRepository(db)
        self.permission_service = PermissionService(db)
        self.audit_log_service = AuditLogService(db)
        self.notification_service = NotificationService(db)

    async def _check_post_scope(self, data: EventCreate | EventUpdate, current_user: User) -> None:
        org_unit_id = getattr(data, "org_unit_id", None)
        allowed = await self.permission_service.can_post_for(current_user, org_unit_id)
        if not allowed:
            raise HTTPException(403, "You are not scoped to post events for this org unit")

    async def _resolve_status(self, current_user: User) -> NoticeStatus:
        if current_user.role.name in AUTO_PUBLISH_ROLES:
            return NoticeStatus.APPROVED
        if not current_user.requires_approval:
            return NoticeStatus.APPROVED
        return NoticeStatus.PENDING

    async def create(self, data: EventCreate, current_user: User, background_tasks: BackgroundTasks) -> Event:
        await self._check_post_scope(data, current_user)
        status = await self._resolve_status(current_user)

        new_event = Event(**data.model_dump(), author_id=current_user.id, status=status)
        created = await self.event_repo.create(new_event)
        reloaded = await self.event_repo.get_by_id(created.id)
        if reloaded is None:
            raise HTTPException(500, "Event creation failed unexpectedly")

        await self.audit_log_service.log(
            current_user, "event.create", "event", reloaded.id, reloaded.title, details=f"status: {status.value}",
        )
        if status == NoticeStatus.PENDING:
            await self.notification_service.notify_event_pending_review(reloaded, background_tasks)
        return reloaded

    async def get_by_id(self, event_id: int) -> Event:
        event = await self.event_repo.get_by_id(event_id)
        if not event:
            raise HTTPException(404, "Event not found")
        return event

    async def list_upcoming(self, limit: int = 50, offset: int = 0) -> list[Event]:
        return await self.event_repo.list_upcoming(limit, offset)

    async def list_pending(self, current_user: User, limit: int, offset: int) -> list[Event]:
        candidates = await self.event_repo.list_pending(limit, offset)
        return [e for e in candidates if await self.permission_service.can_approve_for(current_user, e.org_unit_id)]

    async def list_rejected(self, current_user: User, limit: int, offset: int) -> list[Event]:
        if current_user.role.name not in ("super_admin", "ict_sub_admin", "corporate_admin"):
            raise HTTPException(403, "You don't have permission to view rejected events")
        candidates = await self.event_repo.list_rejected(limit, offset)
        return [e for e in candidates if await self.permission_service.can_approve_for(current_user, e.org_unit_id)]

    async def count_pending(self, current_user: User) -> int:
        candidates = await self.event_repo.list_pending(limit=1000, offset=0)
        count = 0
        for event in candidates:
            if await self.permission_service.can_approve_for(current_user, event.org_unit_id):
                count += 1
        return count

    async def approve(self, event_id: int, current_user: User, background_tasks: BackgroundTasks) -> Event:
        event = await self.event_repo.get_by_id(event_id)
        if not event:
            raise HTTPException(404, "Event not found")
        if not await self.permission_service.can_approve_for(current_user, event.org_unit_id):
            raise HTTPException(403, "You are not scoped to approve this event")

        event.status = NoticeStatus.APPROVED
        event.reviewed_by_id = current_user.id
        event.reviewed_at = datetime.now(timezone.utc)
        await self.event_repo.update(event)

        reloaded = await self.event_repo.get_by_id(event_id)
        await self.audit_log_service.log(current_user, "event.approve", "event", reloaded.id, reloaded.title)
        await self.notification_service.notify_event_approved(reloaded, background_tasks)
        return reloaded

    async def reject(self, event_id: int, rejection_notes: str, current_user: User, background_tasks: BackgroundTasks) -> Event:
        event = await self.event_repo.get_by_id(event_id)
        if not event:
            raise HTTPException(404, "Event not found")
        if not await self.permission_service.can_approve_for(current_user, event.org_unit_id):
            raise HTTPException(403, "You are not scoped to reject this event")

        event.status = NoticeStatus.REJECTED
        event.rejection_notes = rejection_notes
        event.reviewed_by_id = current_user.id
        event.reviewed_at = datetime.now(timezone.utc)
        await self.event_repo.update(event)

        reloaded = await self.event_repo.get_by_id(event_id)
        await self.audit_log_service.log(current_user, "event.reject", "event", reloaded.id, reloaded.title)
        await self.notification_service.notify_event_rejected(reloaded, background_tasks)
        return reloaded

    async def list_my_events(self, current_user: User, limit: int = 50, offset: int = 0, status: NoticeStatus | None = None) -> list[Event]:
        return await self.event_repo.list_by_author(current_user.id, limit, offset, status)

    async def list_for_admin(self, current_user: User, limit: int = 50, offset: int = 0) -> list[Event]:
        if current_user.role.name not in ADMIN_ROLES:
            raise HTTPException(403, "Admin access required")
        return await self.event_repo.list_all_approved(limit, offset)

    async def list_all_for_oversight(self, current_user: User, limit: int, offset: int, search: str | None = None, status: NoticeStatus | None = None) -> list[Event]:
        if current_user.role.name not in ("super_admin", "ict_sub_admin", "corporate_admin"):
            raise HTTPException(403, "You don't have permission to view all events")
        return await self.event_repo.list_all(limit, offset, search, status)

    async def update(self, event_id: int, data: EventUpdate, current_user: User) -> Event:
        event = await self.event_repo.get_by_id(event_id)
        if not event:
            raise HTTPException(404, "Event not found")
        if current_user.role.name != "super_admin" and event.author_id != current_user.id:
            raise HTTPException(403, "Only the author or a super_admin can edit this event")

        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(event, field, value)

        event.status = await self._resolve_status(current_user)
        event.rejection_notes = None
        await self.event_repo.update(event)

        reloaded = await self.event_repo.get_by_id(event_id)
        await self.audit_log_service.log(current_user, "event.update", "event", reloaded.id, reloaded.title)
        return reloaded

    async def set_image(self, event_id: int, image_url: str, image_file_name: str, current_user: User) -> Event:
        event = await self.event_repo.get_by_id(event_id)
        if not event:
            raise HTTPException(404, "Event not found")
        if current_user.role.name != "super_admin" and event.author_id != current_user.id:
            raise HTTPException(403, "Only the author or a super_admin can update this event's image")

        event.image_url = image_url
        event.image_file_name = image_file_name
        return await self.event_repo.update(event)

    async def upload_image(self, event_id: int, file: UploadFile, current_user: User) -> Event:
        event = await self.event_repo.get_by_id(event_id)
        if not event:
            raise HTTPException(404, "Event not found")
        if current_user.role.name != "super_admin" and event.author_id != current_user.id:
            raise HTTPException(403, "Only the event's author or a super_admin can update its image")

        file_path, _ = await save_upload_file(file, subfolder=f"events/{event_id}")

        event.image_url = file_path
        event.image_file_name = file.filename or "unnamed"
        return await self.event_repo.update(event)

    async def delete(self, event_id: int, current_user: User) -> None:
        event = await self.event_repo.get_by_id(event_id)
        if not event:
            raise HTTPException(404, "Event not found")
        if event.author_id != current_user.id and current_user.role.name != "super_admin":
            raise HTTPException(403, "You don't have permission to delete this event")

        title = event.title
        event_id_for_log = event.id
        await self.event_repo.delete(event)
        await self.audit_log_service.log(current_user, "event.delete", "event", event_id_for_log, title)

    async def count_my_events(self, current_user: User) -> dict[str, int]:
        return await self.event_repo.count_by_author(current_user.id)