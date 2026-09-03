from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException

from app.repositories.notice_repository import NoticeRepository
from app.models.notice import NoticeStatus, Notice, Audience
from app.schemas.notice_schema import NoticeCreate, NoticeRead, NoticeUpdate

from app.models.user import User

class NoticeService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.notice_repo = NoticeRepository(db)

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
        if current_user.role.name == "super_admin" or not current_user.requires_approval:
            status = NoticeStatus.APPROVED
        else:
            status = NoticeStatus.PENDING

        notice_data = data.model_dump()
        new_notice = Notice(**notice_data, author_id=current_user.id, status=status)

        created = await self.notice_repo.create(new_notice)
        reloaded = await self.notice_repo.get_by_id(created.id)
        if reloaded is None:
            raise HTTPException(500, "Notice creation failed unexpectedly")
        return reloaded

    

    async def list_pending(self,current_user:User, viewer_audience: Audience|None,limit:int, offset:int) -> list[Notice]:
        if current_user.role.name != "super_admin":
            raise HTTPException(403, "Only super_admin can view the review queue")
        return await self.notice_repo.list_pending(viewer_audience,limit, offset)

    async def approve(self, notice_id: int, current_user: User) -> Notice:
        if current_user.role.name != "super_admin":
            raise HTTPException(403, "Only super_admin can approve a notice")

        notice = await self.notice_repo.get_by_id(notice_id)
        if not notice:
            raise HTTPException(404, "Notice not found")

        notice.status = NoticeStatus.APPROVED
        await self.notice_repo.update(notice)

        reloaded = await self.notice_repo.get_by_id(notice_id)
        if reloaded is None:
            raise HTTPException(500, "Notice update failed unexpectedly")

        return notice

    async def reject(self, notice_id: int, current_user: User) -> Notice:
        if current_user.role.name != "super_admin":
            raise HTTPException(403, "Only super_admin can reject a notice")

        notice = await self.notice_repo.get_by_id(notice_id)
        if not notice:
            raise HTTPException(404, "Notice not found")

        notice.status = NoticeStatus.REJECTED
        await self.notice_repo.update(notice)

        reloaded = await self.notice_repo.get_by_id(notice_id)
        if reloaded is None:
            raise HTTPException(500, "Notice update failed unexpectedly")

        return notice

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
        
        return reloaded

    def _audience_allows(self, notice_audience: Audience, viewer_audience: Audience | None) -> bool:
        if notice_audience == Audience.PUBLIC:
            return True
        if viewer_audience is None:
            return False
        if notice_audience == Audience.STUDENT:
            return viewer_audience in (Audience.STUDENT, Audience.STAFF)
        if notice_audience == Audience.STAFF:
            return viewer_audience == Audience.STAFF
        return False

    async def list_feed(
        self, viewer_audience: Audience | None, limit: int = 50, offset: int = 0
    ) -> list[NoticeRead]:
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
        if current_user.role.name not in ("super_admin", "web_admin"):
            raise HTTPException(403, "Admin access required")
        return await self.notice_repo.list_all_approved(limit, offset)

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

    async def can_access_notice(
        self, notice_id: int, current_user: User | None, viewer_audience: Audience | None
    ) -> bool:
        notice = await self.notice_repo.get_by_id(notice_id)
        if not notice or notice.status != NoticeStatus.APPROVED:
            return False
        if current_user is not None and current_user.role.name in ("super_admin", "web_admin"):
            return True
        return self.audience_allows(notice.audience, viewer_audience)

    async def list_pinned_site(self, limit: int = 10) -> list[Notice]:
        return await self.notice_repo.list_pinned_site(limit)

    async def update(self, notice_id: int, data: NoticeUpdate, current_user: User) -> Notice:
        notice = await self.notice_repo.get_by_id(notice_id)
        if not notice:
            raise HTTPException(404, "Notice not found")

        if current_user.role.name != "super_admin" and notice.author_id != current_user.id:
            raise HTTPException(403, "Only the author or a super_admin can edit this notice")

        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(notice, field, value)

        # Re-evaluate approval status using the same rule as creation.
        if current_user.role.name == "super_admin" or not current_user.requires_approval:
            notice.status = NoticeStatus.APPROVED
        else:
            notice.status = NoticeStatus.PENDING

        await self.notice_repo.update(notice)
        reloaded = await self.notice_repo.get_by_id(notice_id)
        if reloaded is None:
            raise HTTPException(500, "Notice update failed unexpectedly")
        return reloaded

    async def delete(self, notice_id: int, current_user: User) -> None:
        notice = await self.notice_repo.get_by_id(notice_id)
        if not notice:
            raise HTTPException(404, "Notice not found")

        if current_user.role.name != "super_admin" and notice.author_id != current_user.id:
            raise HTTPException(403, "Only the author or a super_admin can delete this notice")

        await self.notice_repo.delete(notice)

    

    