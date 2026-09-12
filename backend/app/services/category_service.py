# app/services/category_service.py
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException
from sqlalchemy.exc import IntegrityError

from app.repositories.category_repository import CategoryRepository
from app.repositories.notice_repository import NoticeRepository
from app.services.permission_service import PermissionService
from app.models.category import Category
from app.models.user import User
from app.schemas.category_schema import CategoryCreate

TAG_MANAGE_ROLES = ("super_admin", "web_admin")


class CategoryService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.category_repo = CategoryRepository(db)
        self.notice_repo = NoticeRepository(db)
        self.permission_service = PermissionService(db)

    def _check_manage_permission(self, current_user: User) -> None:
        if current_user.role.name in TAG_MANAGE_ROLES:
            return
        if self.permission_service.has_right(current_user, "can_manage_tags"):
            return
        raise HTTPException(403, "You don't have permission to manage categories")

    async def create(self, data: CategoryCreate, current_user: User) -> Category:
        self._check_manage_permission(current_user)
        new_category = Category(**data.model_dump())
        try:
            return await self.category_repo.create(new_category)
        except IntegrityError:
            raise HTTPException(400, "A category with this name already exists")

    async def list_all(self) -> list[Category]:
        return await self.category_repo.list_all()

    async def get_by_id(self, id: int) -> Category:
        category = await self.category_repo.get_by_id(id)
        if not category:
            raise HTTPException(404, "Category not found")
        return category

    async def reassign_notices(self, current_user: User, from_id: int, to_id: int) -> dict:
        self._check_manage_permission(current_user)

        from_category = await self.category_repo.get_by_id(from_id)
        if not from_category:
            raise HTTPException(404, "Source category not found")
        to_category = await self.category_repo.get_by_id(to_id)
        if not to_category:
            raise HTTPException(404, "Target category not found")
        if from_id == to_id:
            raise HTTPException(400, "Source and target cannot be the same")

        notices = await self.notice_repo.list_by_category_id(from_id)
        for notice in notices:
            notice.category_id = to_id
            await self.notice_repo.update(notice)
        return {"notices_moved": len(notices)}

    async def delete(self, current_user: User, category_id: int) -> None:
        if current_user.role.name != "super_admin" and not self.permission_service.has_right(current_user, "can_manage_tags"):
            raise HTTPException(403, "You do not have permission to delete this category!")

        category = await self.category_repo.get_by_id(category_id)
        if not category:
            raise HTTPException(404, "Category not found!")

        notices = await self.notice_repo.list_by_category_id(category_id)
        if notices:
            raise HTTPException(400, "Cant delete a category with existing notices. Reassign notices then delete.")
        await self.category_repo.delete(category)