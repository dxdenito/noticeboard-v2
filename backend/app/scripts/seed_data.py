import asyncio
from sqlalchemy import select
from app.core.database import AsyncSessionLocal
from app.models.role import Role
from app.models.category import Category

ROLE_NAMES = [
    "super_admin",
    "ict_sub_admin",
    "corporate_super_admin",
    "corporate_admin",
    "web_admin",
]

CATEGORY_NAMES = [
    "General",
    "Academic",
    "Event",
    "Deadline",
    "Bereavement",
    "Farm"
]


async def seed_roles(db) -> None:
    for name in ROLE_NAMES:
        existing = await db.execute(select(Role).where(Role.name == name))
        if existing.scalar_one_or_none() is None:
            db.add(Role(name=name))


async def seed_categories(db) -> None:
    for name in CATEGORY_NAMES:
        existing = await db.execute(select(Category).where(Category.name == name))
        if existing.scalar_one_or_none() is None:
            db.add(Category(name=name))


async def seed_all() -> None:
    async with AsyncSessionLocal() as db:
        await seed_roles(db)
        await seed_categories(db)
        await db.commit()
        print("Seed complete: roles, categories.")


if __name__ == "__main__":
    asyncio.run(seed_all())