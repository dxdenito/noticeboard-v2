from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException

from app.repositories.notice_repository import NoticeRepository
from app.services.permission_service import PermissionService
from app.services.audit_log_service import AuditLogService
from app.models.notice import NoticeStatus, Notice, Audience
from app.schemas.notice_schema import NoticeCreate, NoticeRead, NoticeUpdate

from app.models.user import User

ADMIN_ROLES = ("super_admin", "ict_sub_admin", "corporate_super_admin", "corporate_admin", "web_admin")
AUTO_PUBLISH_ROLES = ("super_admin", "corporate_super_admin", "corporate_admin")


class NoticeService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.notice_repo = NoticeRepository(db)
        self.permission_service = PermissionService(db)
        self.audit_log_service = AuditLogService(db)

    async def _check_post_scope(self, data: NoticeCreate | NoticeUpdate, current_user: User) -> None:
        org_unit_id = getattr(data, "org_unit_id", None)
        allowed = await self.permission_service.can_post_for(current_user, org_unit_id)
        if not allowed:
            raise HTTPException(403, "You are not scoped to post for this org unit")

    async def _resolve_status(self, current_user: User) -> NoticeStatus:
        if current_user.role.name in AUTO_PUBLISH_ROLES:
            return NoticeStatus.APPROVED
        if not current_user.requires_approval:
            return NoticeStatus.APPROVED
        return NoticeStatus.PENDING

    async def get_by_id(self, notice_id: int, viewer_audience: Audience | None) -> NoticeRead:
        notice = await self.notice_repo.get_by_id(notice_id)
        if not notice or notice.status != NoticeStatus.APPROVED:
            raise HTTPException(404, "Notice not found")

        allowed = self.audience_allows(notice.audience, viewer_audience)
        data = NoticeRead.model_validate(notice)
        data.is_locked = not allowed
        if not allowed:
            data.body = None
        return data

    async def create(self, data: NoticeCreate, current_user: User) -> Notice:
        await self._check_post_scope(data, current_user)
        status = await self._resolve_status(current_user)

        notice_data = data.model_dump()
        new_notice = Notice(**notice_data, author_id=current_user.id, status=status)

        created = await self.notice_repo.create(new_notice)
        reloaded = await self.notice_repo.get_by_id(created.id)
        if reloaded is None:
            raise HTTPException(500, "Notice creation failed unexpectedly")

        await self.audit_log_service.log(
            current_user, "notice.create", "notice", reloaded.id, reloaded.title,
            details=f"status: {status.value}",
        )
        return reloaded

    async def list_pending(self, current_user: User, viewer_audience: Audience | None, limit: int, offset: int) -> list[Notice]:
        candidates = await self.notice_repo.list_pending(viewer_audience, limit, offset)
        allowed = []
        for notice in candidates:
            if await self.permission_service.can_approve_for(current_user, notice.org_unit_id):
                allowed.append(notice)
        return allowed

    async def approve(self, notice_id: int, current_user: User) -> Notice:
        notice = await self.notice_repo.get_by_id(notice_id)
        if not notice:
            raise HTTPException(404, "Notice not found")

        if not await self.permission_service.can_approve_for(current_user, notice.org_unit_id):
            raise HTTPException(403, "You are not scoped to approve this notice")

        notice.status = NoticeStatus.APPROVED
        await self.notice_repo.update(notice)

        reloaded = await self.notice_repo.get_by_id(notice_id)
        if reloaded is None:
            raise HTTPException(500, "Notice update failed unexpectedly")

        await self.audit_log_service.log(
            current_user, "notice.approve", "notice", reloaded.id, reloaded.title,
        )
        return reloaded

    async def reject(self, notice_id: int, current_user: User) -> Notice:
        notice = await self.notice_repo.get_by_id(notice_id)
        if not notice:
            raise HTTPException(404, "Notice not found")

        if not await self.permission_service.can_approve_for(current_user, notice.org_unit_id):
            raise HTTPException(403, "You are not scoped to reject this notice")

        notice.status = NoticeStatus.REJECTED
        await self.notice_repo.update(notice)

        reloaded = await self.notice_repo.get_by_id(notice_id)
        if reloaded is None:
            raise HTTPException(500, "Notice update failed unexpectedly")

        await self.audit_log_service.log(
            current_user, "notice.reject", "notice", reloaded.id, reloaded.title,
        )
        return reloaded

    async def pin_site(self, notice_id: int, current_user: User) -> Notice:
        if current_user.role.name != "super_admin":
            raise HTTPException(403, "Only an admin can pin notices")

        notice = await self.notice_repo.get_by_id(notice_id)
        if not notice:
            raise HTTPException(404, "Notice not found")

        if notice.audience != Audience.PUBLIC:
            raise HTTPException(400, "Only public notices can be pinned to the site")

        notice.is_pinned_site = True
        await self.notice_repo.update(notice)

        reloaded = await self.notice_repo.get_by_id(notice_id)
        if reloaded is None:
            raise HTTPException(500, "Notice update failed unexpectedly")

        await self.audit_log_service.log(
            current_user, "notice.pin_site", "notice", reloaded.id, reloaded.title,
        )
        return reloaded

    async def unpin_site(self, notice_id: int, current_user: User) -> Notice:
        if current_user.role.name != "super_admin":
            raise HTTPException(403, "Only an admin can pin notices")

        notice = await self.notice_repo.get_by_id(notice_id)
        if not notice:
            raise HTTPException(404, "Notice not found")

        notice.is_pinned_site = False
        await self.notice_repo.update(notice)

        reloaded = await self.notice_repo.get_by_id(notice_id)
        if reloaded is None:
            raise HTTPException(500, "Notice update failed unexpectedly")

        await self.audit_log_service.log(
            current_user, "notice.unpin_site", "notice", reloaded.id, reloaded.title,
        )
        return reloaded

    async def pin_feed(self, notice_id: int, current_user: User) -> Notice:
        if current_user.role.name != "super_admin":
            raise HTTPException(403, "Only an admin can pin notices")

        notice = await self.notice_repo.get_by_id(notice_id)
        if not notice:
            raise HTTPException(404, "Notice not found")

        notice.is_pinned_feed = True
        await self.notice_repo.update(notice)

        reloaded = await self.notice_repo.get_by_id(notice_id)
        if reloaded is None:
            raise HTTPException(500, "Notice update failed unexpectedly")

        await self.audit_log_service.log(
            current_user, "notice.pin_feed", "notice", reloaded.id, reloaded.title,
        )
        return reloaded

    async def unpin_feed(self, notice_id: int, current_user: User) -> Notice:
        if current_user.role.name != "super_admin":
            raise HTTPException(403, "Only an admin can pin notices")

        notice = await self.notice_repo.get_by_id(notice_id)
        if not notice:
            raise HTTPException(404, "Notice not found")

        notice.is_pinned_feed = False
        await self.notice_repo.update(notice)

        reloaded = await self.notice_repo.get_by_id(notice_id)
        if reloaded is None:
            raise HTTPException(500, "Notice update failed unexpectedly")

        await self.audit_log_service.log(
            current_user, "notice.unpin_feed", "notice", reloaded.id, reloaded.title,
        )
        return reloaded

    def audience_allows(self, notice_audience: Audience, viewer_audience: Audience | None) -> bool:
        if notice_audience == Audience.PUBLIC:
            return True
        if viewer_audience is None:
            return False
        if notice_audience == Audience.STUDENT:
            return viewer_audience in (Audience.STUDENT, Audience.STAFF)
        if notice_audience == Audience.STAFF:
            return viewer_audience == Audience.STAFF
        return False

    async def list_feed(self, viewer_audience: Audience | None, limit: int = 50, offset: int = 0) -> list[NoticeRead]:
        notices = await self.notice_repo.list_all_approved(limit, offset)
        results = []
        for notice in notices:
            allowed = self.audience_allows(notice.audience, viewer_audience)
            data = NoticeRead.model_validate(notice)
            data.is_locked = not allowed
            if not allowed:
                data.body = None
            results.append(data)
        return results

    async def list_my_notices(self, current_user: User, limit: int = 50, offset: int = 0) -> list[Notice]:
        return await self.notice_repo.list_by_author(current_user.id, limit, offset)

    async def list_for_admin(self, current_user: User, limit: int = 50, offset: int = 0) -> list[Notice]:
        if current_user.role.name not in ADMIN_ROLES:
            raise HTTPException(403, "Admin access required")
        return await self.notice_repo.list_all_approved(limit, offset)

    async def can_access_notice(self, notice_id: int, current_user: User | None, viewer_audience: Audience | None) -> bool:
        notice = await self.notice_repo.get_by_id(notice_id)
        if not notice or notice.status != NoticeStatus.APPROVED:
            return False
        if current_user is not None and current_user.role.name in ADMIN_ROLES:
            return True
        return self.audience_allows(notice.audience, viewer_audience)

    async def list_pinned_site(self, limit: int = 10) -> list[Notice]:
        return await self.notice_repo.list_pinned_site(limit)

    async def update(self, notice_id: int, data: NoticeUpdate, current_user: User) -> Notice:
        await self._check_post_scope(data, current_user)
        notice = await self.notice_repo.get_by_id(notice_id)
        if not notice:
            raise HTTPException(404, "Notice not found")

        if current_user.role.name != "super_admin" and notice.author_id != current_user.id:
            raise HTTPException(403, "Only the author or a super_admin can edit this notice")

        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(notice, field, value)

        notice.status = await self._resolve_status(current_user)

        await self.notice_repo.update(notice)
        reloaded = await self.notice_repo.get_by_id(notice_id)
        if reloaded is None:
            raise HTTPException(500, "Notice update failed unexpectedly")

        await self.audit_log_service.log(
            current_user, "notice.update", "notice", reloaded.id, reloaded.title,
        )
        return reloaded

    async def delete(self, notice_id: int, current_user: User) -> None:
        notice = await self.notice_repo.get_by_id(notice_id)
        if not notice:
            raise HTTPException(404, "Notice not found")

        if current_user.role.name != "super_admin" and notice.author_id != current_user.id:
            raise HTTPException(403, "Only the author or a super_admin can delete this notice")

        title = notice.title
        notice_id_for_log = notice.id
        await self.notice_repo.delete(notice)

        await self.audit_log_service.log(
            current_user, "notice.delete", "notice", notice_id_for_log, title,
        )