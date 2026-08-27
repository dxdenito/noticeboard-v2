# app/services/department_service.py
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException
from sqlalchemy.exc import IntegrityError

from app.repositories.department_repository import DepartmentRepository
from app.repositories.notice_repository import NoticeRepository
from app.models.department import Department
from app.schemas.department_schema import DepartmentCreate


class DepartmentService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.department_repo = DepartmentRepository(db)
        self.notice_repo = NoticeRepository(db)

    async def create(self, data: DepartmentCreate) -> Department:
        new_department = Department(**data.model_dump())
        try:
            return await self.department_repo.create(new_department)
        except IntegrityError:
            raise HTTPException(400, "A department with this name or code already exists")

    async def list_all(self) -> list[Department]:
        return await self.department_repo.list_all()

    async def get_by_id(self, id: int) -> Department:
        department = await self.department_repo.get_by_id(id)
        if not department:
            raise HTTPException(404, "Department not found")
        return department

    async def reassign_notices(self, from_id: int, to_id: int) -> dict:
        from_dept = await self.department_repo.get_by_id(from_id)
        if not from_dept:
            raise HTTPException(404, "Source department not found")
        to_dept = await self.department_repo.get_by_id(to_id)
        if not to_dept:
            raise HTTPException(404, "Target department not found")
        if from_id == to_id:
            raise HTTPException(400, "Source and target cannot be the same")

        notices = await self.notice_repo.list_by_department_id(from_id)
        for notice in notices:
            notice.department_id = to_id
            await self.notice_repo.update(notice)
        return {"notices_moved": len(notices)}

    async def delete(self, department_id: int) -> None:
        department = await self.department_repo.get_by_id(department_id)
        if not department:
            raise HTTPException(404, "Department not found")
        notices = await self.notice_repo.list_by_department_id(department_id)
        if notices:
            raise HTTPException(400, f"Cannot delete: {len(notices)} notice(s) still reference this department. Reassign them first.")
        await self.department_repo.delete(department)