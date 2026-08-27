# app/services/club_service.py
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException
from sqlalchemy.exc import IntegrityError

from app.repositories.club_repository import ClubRepository
from app.repositories.notice_repository import NoticeRepository
from app.models.club import Club
from app.models.user import User
from app.schemas.club_schema import ClubCreate


class ClubService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.club_repo = ClubRepository(db)
        self.notice_repo = NoticeRepository(db)

    async def create(self, data: ClubCreate) -> Club:
        new_club = Club(**data.model_dump())
        try:
            return await self.club_repo.create(new_club)
        except IntegrityError:
            raise HTTPException(400, "A club with this name already exists")

    async def list_all(self) -> list[Club]:
        return await self.club_repo.list_all()

    async def get_by_id(self, id: int) -> Club:
        club = await self.club_repo.get_by_id(id)
        if not club:
            raise HTTPException(404, "Club not found")
        return club
    
    async def reassign_notices(self, from_id: int, to_id: int) -> dict:
            from_club = await self.club_repo.get_by_id(from_id)
            if not from_club:
                raise HTTPException(404, "Source club not found")
            to_club = await self.club_repo.get_by_id(to_id)
            if not to_club:
                raise HTTPException(404, "Target club not found")
            if from_id == to_id:
                raise HTTPException(400, "Source and target cannot be the same")
    
            notices = await self.notice_repo.list_by_club_id(from_id)
            for notice in notices:
                notice.club_id = to_id
                await self.notice_repo.update(notice)
            return {"notices_moved": len(notices)}
    
    async def delete(self,current_user:User, club_id:int)-> None:
        club = await self.club_repo.get_by_id(club_id)
        if not club:
            raise HTTPException(404,"Club not found")
       
        if current_user.role.name != "super_admin":
            raise HTTPException(
                403,"You have no permission to delete this club"
            )
        notices = await self.notice_repo.list_by_club_id(club_id)
        if notices:
            raise HTTPException(
                400,
                f"Cannot delete club: {len(notices)} still tagged. Reassign them first"
            )
        await self.club_repo.create(club)