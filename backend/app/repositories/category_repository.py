# app/repositories/category_repository.py
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.category import Category


class CategoryRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, id: int) -> Category | None:
        statement = select(Category).where(Category.id == id)
        result = await self.db.execute(statement)
        return result.scalars().first()

    async def create(self, category: Category) -> Category:
        self.db.add(category)
        await self.db.commit()
        await self.db.refresh(category)
        return category

    async def list_all(self) -> list[Category]:
        statement = select(Category)
        result = await self.db.execute(statement)
        return list(result.scalars().all())

    async def delete(self, category: Category) -> None:
        await self.db.delete(category)
        await self.db.commit()