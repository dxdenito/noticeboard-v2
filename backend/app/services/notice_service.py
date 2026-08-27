from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException

from app.repositories.notice_repository import NoticeRepository
from app.models.notice import NoticeStatus, Notice, Audience
from app.schemas.notice_schema import NoticeCreate

from app.models.user import User

class NoticeService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.notice_repo = NoticeRepository(db)

    async def get_by_id(self, notice_id:int):
        notice = await self.notice_repo.get_by_id(notice_id)
        if not notice:
            raise HTTPException(404, "Notice not found")

        return notice

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

    async def list_feed(
        self, viewer_audience: Audience | None, limit: int = 50, offset: int = 0
    ) -> list[Notice]:
        return await self.notice_repo.list_for_viewer(viewer_audience, limit, offset)

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

    

    