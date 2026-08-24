import asyncio
from sqlalchemy import select
from app.core.database import AsyncSessionLocal
from app.models.role import Role

ROLE_NAMES = ["super_admin", "web_admin"]


async def seed_roles(db) -> None:
    for name in ROLE_NAMES:
        existing = await db.execute(select(Role).where(Role.name == name))
        if existing.scalar_one_or_none() is None:
            db.add(Role(name=name))


async def seed_all() -> None:
    async with AsyncSessionLocal() as db:
        await seed_roles(db)
        await db.commit()
        print("Seed complete: roles.")


if __name__ == "__main__":
    asyncio.run(seed_all())