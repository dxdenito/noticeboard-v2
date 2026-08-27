# app/repositories/course_repository.py
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.course import Course


class CourseRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, id: int) -> Course | None:
        statement = select(Course).where(Course.id == id)
        result = await self.db.execute(statement)
        return result.scalars().first()

    async def create(self, course: Course) -> Course:
        self.db.add(course)
        await self.db.commit()
        await self.db.refresh(course)
        return course

    async def list_all(self) -> list[Course]:
        statement = select(Course)
        result = await self.db.execute(statement)
        return list(result.scalars().all())

    async def delete(self, course: Course) -> None:
        await self.db.delete(course)
        await self.db.commit()
        