import asyncio
from sqlalchemy import select
from app.core.database import AsyncSessionLocal
from app.core.security import hash_password
from app.models.role import Role
from app.models.user import User


async def create_super_admin(email: str, password: str, full_name: str) -> None:
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Role).where(Role.name == "super_admin"))
        role = result.scalar_one_or_none()
        if role is None:
            print("super_admin role not found — run seed_data.py first.")
            return

        existing = await db.execute(select(User).where(User.email == email))
        if existing.scalar_one_or_none() is not None:
            print(f"A user with email {email} already exists.")
            return

        user = User(
            email=email,
            hashed_password=hash_password(password),
            full_name=full_name,
            role_id=role.id,
            requires_approval=None,  # not applicable to super_admin
            is_active=True,
        )
        db.add(user)
        await db.commit()
        print(f"super_admin created: {email}")


if __name__ == "__main__":
    email = input("Email: ")
    password = input("Password: ")
    full_name = input("Full name: ")
    asyncio.run(create_super_admin(email, password, full_name))