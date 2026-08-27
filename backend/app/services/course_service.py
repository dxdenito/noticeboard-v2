# app/services/course_service.py
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException
from sqlalchemy.exc import IntegrityError

from app.repositories.course_repository import CourseRepository
from app.repositories.notice_repository import NoticeRepository
from app.models.course import Course
from app.models.user import User
from app.schemas.course_schema import CourseCreate


class CourseService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.course_repo = CourseRepository(db)
        self.notice_repo = NoticeRepository(db)

    async def create(self, data: CourseCreate) -> Course:
        new_course = Course(**data.model_dump())
        try:
            return await self.course_repo.create(new_course)
        except IntegrityError:
            raise HTTPException(400, "A course with this name or code already exists")

    async def list_all(self) -> list[Course]:
        return await self.course_repo.list_all()

    async def get_by_id(self, id: int) -> Course:
        course = await self.course_repo.get_by_id(id)
        if not course:
            raise HTTPException(404, "Course not found")
        return course
    
    async def delete(self, current_user: User, course_id: int) -> None:
        if current_user.role.name != "super_admin":
            raise HTTPException(403, "Forbidden, not allowed to delete")

        course = await self.course_repo.get_by_id(course_id)
        if not course:
            raise HTTPException(404, "Course not found")

        notices = await self.notice_repo.list_by_course_id(course_id)
        if notices:
            raise HTTPException(400, f"Cannot delete this course: {len(notices)} notice(s) still tagged. Reasssign them first.")

        await self.course_repo.delete(course)

    async def reassign_notices(self, from_id: int, to_id: int) -> dict:
            from_course = await self.course_repo.get_by_id(from_id)
            if not from_course:
                raise HTTPException(404, "Source course not found")
            to_course = await self.course_repo.get_by_id(to_id)
            if not to_course:
                raise HTTPException(404, "Target course not found")
            if from_id == to_id:
                raise HTTPException(400, "Source and target cannot be the same")
    
            notices = await self.notice_repo.list_by_course_id(from_id)
            for notice in notices:
                notice.course_id = to_id
                await self.notice_repo.update(notice)
            return {"notices_moved": len(notices)}