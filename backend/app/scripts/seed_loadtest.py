import argparse
import asyncio
import getpass
import random
from datetime import datetime, timedelta, timezone

from sqlalchemy import select, delete, insert

from app.core.config import settings
from app.core.database import AsyncSessionLocal
from app.core.security import hash_password
from app.models.audit_log import AuditLog
from app.models.category import Category
from app.models.event import Event
from app.models.notice import Audience, Notice, NoticeStatus
from app.models.notification import Notification
from app.models.org_unit import OrgUnit
from app.models.role import Role
from app.models.user import User
from app.scripts.seed_data import seed_roles, seed_categories

LOADTEST_EMAIL = "loadtest-admin@loadtest.invalid"
CHUNK = 2000
PARAGRAPH = "<p>" + ("Notice body text used for load testing the noticeboard. " * 8) + "</p>"
BODY = PARAGRAPH * 3
AUDIENCES = [Audience.PUBLIC] * 7 + [Audience.STUDENT] * 2 + [Audience.STAFF]
ACTIONS = [
    ("notice.create", "notice"),
    ("notice.update", "notice"),
    ("notice.approve", "notice"),
    ("event.create", "event"),
    ("event.update", "event"),
    ("user.update", "user"),
    ("auth.login", "user"),
    ("org_unit.update", "org_unit"),
]


def confirm_database() -> None:
    database_name = settings.database_url.rsplit("/", 1)[-1].split("?")[0]
    print(f"Target database: {database_name}")
    answer = input("Type the database name to continue: ").strip()
    if answer != database_name:
        raise SystemExit("Cancelled")


async def seed(notice_count: int, event_count: int, audit_count: int, password: str) -> None:
    now = datetime.now(timezone.utc)

    async with AsyncSessionLocal() as db:
        existing = await db.execute(select(User).where(User.email == LOADTEST_EMAIL))
        if existing.scalar_one_or_none() is not None:
            raise SystemExit("Load test data already exists. Run with --cleanup first.")

        await seed_roles(db)
        await seed_categories(db)
        await db.commit()

        role = (await db.execute(select(Role).where(Role.name == "super_admin"))).scalar_one()
        category_ids = list((await db.execute(select(Category.id))).scalars().all())

        roots = list(
            (
                await db.execute(
                    select(OrgUnit.id).where(OrgUnit.parent_id.is_(None)).order_by(OrgUnit.id)
                )
            ).scalars().all()
        )
        if roots:
            root_id = roots[0]
        else:
            root = OrgUnit(name="LOADTEST Root", type="university")
            db.add(root)
            await db.flush()
            root_id = root.id

        departments = [
            OrgUnit(name=f"LOADTEST Dept {i}", type="Department", parent_id=root_id)
            for i in range(1, 21)
        ]
        db.add_all(departments)
        await db.flush()
        org_unit_ids = [unit.id for unit in departments]

        user = User(
            email=LOADTEST_EMAIL,
            full_name="Load Test Admin",
            hashed_password=hash_password(password),
            pf_number="LOADTEST",
            org_unit_id=root_id,
            role_id=role.id,
            must_change_password=False,
            is_active=True,
            activated_at=now,
        )
        db.add(user)
        await db.flush()

        notices = []
        for index in range(notice_count):
            status = NoticeStatus.PENDING if index % 20 == 0 else NoticeStatus.APPROVED
            notices.append(
                Notice(
                    title=f"LOADTEST Notice {index + 1}",
                    body=BODY,
                    author_id=user.id,
                    audience=random.choice(AUDIENCES),
                    org_unit_id=random.choice(org_unit_ids),
                    category_id=random.choice(category_ids),
                    status=status,
                    is_pinned_feed=index % 150 == 0 and status == NoticeStatus.APPROVED,
                    created_at=now - timedelta(minutes=random.randint(1, 60 * 24 * 180)),
                )
            )
        for start in range(0, len(notices), CHUNK):
            db.add_all(notices[start:start + CHUNK])
            await db.flush()

        events = []
        for index in range(event_count):
            start_date = now + timedelta(days=random.randint(-30, 60), hours=random.randint(0, 23))
            events.append(
                Event(
                    title=f"LOADTEST Event {index + 1}",
                    description=BODY,
                    start_date=start_date,
                    end_date=start_date + timedelta(hours=3),
                    location="LOADTEST Hall",
                    audience=random.choice(AUDIENCES),
                    org_unit_id=random.choice(org_unit_ids),
                    author_id=user.id,
                    status=NoticeStatus.PENDING if index % 20 == 0 else NoticeStatus.APPROVED,
                    created_at=now - timedelta(minutes=random.randint(1, 60 * 24 * 90)),
                )
            )
        for start in range(0, len(events), CHUNK):
            db.add_all(events[start:start + CHUNK])
            await db.flush()

        written = 0
        while written < audit_count:
            size = min(CHUNK * 2, audit_count - written)
            rows = []
            for _ in range(size):
                action, target_type = random.choice(ACTIONS)
                number = random.randint(1, max(notice_count, 1))
                rows.append(
                    {
                        "actor_id": user.id,
                        "action": action,
                        "target_type": target_type,
                        "target_id": number,
                        "target_label": f"LOADTEST Item {number}",
                        "details": "title: Old title → New title; status: approved → pending",
                        "created_at": now - timedelta(seconds=random.randint(1, 60 * 60 * 24 * 365)),
                    }
                )
            await db.execute(insert(AuditLog), rows)
            written += size

        await db.commit()
        print(
            f"Seeded {notice_count} notices, {event_count} events, {audit_count} audit rows. "
            f"Login: {LOADTEST_EMAIL}"
        )


async def cleanup() -> None:
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(User).where(User.email == LOADTEST_EMAIL))
        user = result.scalar_one_or_none()
        if user is None:
            print("Nothing to clean up")
            return

        await db.execute(delete(AuditLog).where(AuditLog.actor_id == user.id))
        await db.execute(delete(Notification).where(Notification.recipient_id == user.id))
        await db.execute(delete(Notice).where(Notice.author_id == user.id))
        await db.execute(delete(Event).where(Event.author_id == user.id))
        await db.execute(delete(User).where(User.id == user.id))
        await db.execute(delete(OrgUnit).where(OrgUnit.name.like("LOADTEST Dept %")))
        await db.commit()
        print("Load test data removed")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--notices", type=int, default=2000)
    parser.add_argument("--events", type=int, default=300)
    parser.add_argument("--audit", type=int, default=100000)
    parser.add_argument("--cleanup", action="store_true")
    args = parser.parse_args()

    confirm_database()

    if args.cleanup:
        asyncio.run(cleanup())
        return

    password = getpass.getpass("Password for the load test admin: ")
    if len(password) < 8:
        raise SystemExit("Use a password of at least 8 characters")
    asyncio.run(seed(args.notices, args.events, args.audit, password))


if __name__ == "__main__":
    main()