import asyncio
from sqlalchemy import select
from app.core.database import AsyncSessionLocal
from app.core.security import hash_password
from app.models.role import Role
from app.models.user import User
from app.models.org_unit import OrgUnit
from datetime import datetime, timezone

DEFAULT_ROOT_NAME = "JKUAT"
DEFAULT_ROOT_TYPE = "university"


async def get_or_create_root_org_unit(db, name: str, unit_type: str) -> OrgUnit:
    result = await db.execute(
        select(OrgUnit).where(OrgUnit.parent_id.is_(None)).order_by(OrgUnit.id).limit(1)
    )
    root = result.scalar_one_or_none()
    if root is not None:
        return root
    root = OrgUnit(name=name, type=unit_type, parent_id=None)
    db.add(root)
    await db.flush()
    return root


async def create_super_admin(
    email: str,
    password: str,
    full_name: str,
    pf_number: str,
    root_name: str = DEFAULT_ROOT_NAME,
    root_type: str = DEFAULT_ROOT_TYPE,
) -> None:
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Role).where(Role.name == "super_admin"))
        role = result.scalar_one_or_none()
        if role is None:
            print("super_admin role not found. Run seed_data.py first.")
            return

        existing = await db.execute(select(User).where(User.email == email))
        if existing.scalar_one_or_none() is not None:
            print(f"A user with email {email} already exists.")
            return

        root = await get_or_create_root_org_unit(db, root_name, root_type)

        user = User(
            email=email,
            hashed_password=hash_password(password),
            full_name=full_name,
            pf_number=pf_number,
            org_unit_id=root.id,
            role_id=role.id,
            requires_approval=None,
            is_active=True,
            activated_at=datetime.now(timezone.utc)
        )
        db.add(user)
        await db.commit()
        print(f"super_admin created: {email} (org unit: {root.name}, id {root.id})")


if __name__ == "__main__":
    email = input("Email: ").strip()
    password = input("Password: ")
    full_name = input("Full name: ").strip()
    pf_number = input("PF number: ").strip()
    root_name = input(f"Root org unit name [{DEFAULT_ROOT_NAME}]: ").strip() or DEFAULT_ROOT_NAME
    root_type = input(f"Root org unit type [{DEFAULT_ROOT_TYPE}]: ").strip() or DEFAULT_ROOT_TYPE
    asyncio.run(create_super_admin(email, password, full_name, pf_number, root_name, root_type))