import asyncio
import logging
from dataclasses import dataclass
from datetime import datetime, time, timedelta, timezone
from email.message import EmailMessage

import aiosmtplib
from fastapi import BackgroundTasks, HTTPException
from sqlalchemy import func, or_, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.core.database import AsyncSessionLocal
from app.core.digest_email import (
    DigestEvent, DigestMessage, DigestNotice, build_message, make_excerpt,
)
from app.models.digest import DigestRun, DigestRunNotice, DigestSettings
from app.models.event import Event
from app.models.notice import Audience, Notice, NoticeStatus
from app.models.user import User
from app.repositories.institutional_domain_repository import InstitutionalDomainRepository
from app.services.audit_log_service import AuditLogService, format_changes, snapshot

logger = logging.getLogger("digest")

EAT = timezone(timedelta(hours=3))
AUDIENCES = (Audience.STUDENT, Audience.STAFF)
LIST_LABELS = {Audience.STUDENT: "students", Audience.STAFF: "staff"}
STALE_RUN_MINUTES = 15
SCHEDULE_GRACE_HOURS = 6
SCHEDULER_INTERVAL_SECONDS = 300
DEFAULT_WINDOW_DAYS = 7
EVENT_WINDOW_DAYS = 7
SEND_ATTEMPT_DELAYS = (0, 3, 10)
SETTINGS_FIELDS = (
    "auto_enabled", "send_day", "send_hour", "max_notices", "excerpt_length",
    "include_events", "paused_until", "student_list_email", "staff_list_email",
)


class NothingToSend(Exception):
    pass


class Busy(Exception):
    pass


@dataclass
class Target:
    audience: Audience
    email: str | None
    problem: str | None


@dataclass
class Plan:
    notice_ids: list[int]
    window_start: datetime | None
    window_end: datetime | None
    lists_total: int


def clean_email(value: str | None) -> str | None:
    email = (value or "").strip().lower()
    return email or None


def audience_allows(notice_audience: Audience, viewer_audience: Audience) -> bool:
    if notice_audience == Audience.PUBLIC:
        return True
    if notice_audience == Audience.STUDENT:
        return viewer_audience in (Audience.STUDENT, Audience.STAFF)
    if notice_audience == Audience.STAFF:
        return viewer_audience == Audience.STAFF
    return False


def next_slot(reference: datetime, day: int, hour: int) -> datetime:
    days_ahead = (day - reference.weekday()) % 7
    candidate = (reference + timedelta(days=days_ahead)).replace(
        hour=hour, minute=0, second=0, microsecond=0
    )
    if candidate < reference:
        candidate += timedelta(days=7)
    return candidate


def to_mime(to: str, subject: str, message: DigestMessage) -> EmailMessage:
    mime = EmailMessage()
    mime["From"] = settings.smtp_from_email
    mime["To"] = to
    mime["Subject"] = subject
    mime.set_content(message.text)
    mime.add_alternative(message.html, subtype="html")
    return mime


class SmtpSession:
    def __init__(self):
        self.client: aiosmtplib.SMTP | None = None

    async def open(self) -> None:
        self.client = aiosmtplib.SMTP(
            hostname=settings.smtp_host,
            port=settings.smtp_port,
            username=settings.smtp_username,
            password=settings.smtp_password,
            start_tls=True,
        )
        await self.client.connect()

    async def send(self, message: EmailMessage) -> None:
        await self.client.send_message(message)

    async def close(self) -> None:
        if self.client is not None:
            try:
                await self.client.quit()
            except Exception:
                pass


class DigestService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.audit = AuditLogService(db)

    async def get_settings(self) -> DigestSettings:
        row = await self.db.get(DigestSettings, 1)
        if row is None:
            row = DigestSettings(id=1)
            self.db.add(row)
            try:
                await self.db.commit()
            except IntegrityError:
                await self.db.rollback()
                row = await self.db.get(DigestSettings, 1)
            else:
                await self.db.refresh(row)
        return row

    async def _domain_map(self) -> dict[str, Audience]:
        items = await InstitutionalDomainRepository(self.db).list_all()
        return {item.domain: item.audience for item in items}

    @staticmethod
    def _list_problem(audience: Audience, email: str | None, domain_map: dict[str, Audience]) -> str | None:
        if email is None:
            return "No group address is set"
        domain = email.rsplit("@", 1)[-1].lower()
        registered = domain_map.get(domain)
        if registered is None:
            return f"{domain} is not a registered institutional domain"
        if registered != audience:
            return f"{domain} is registered for {registered.value}, not {audience.value}"
        return None

    async def update_settings(self, data: dict, current_user: User) -> DigestSettings:
        domain_map = await self._domain_map()
        for audience, key in (
            (Audience.STUDENT, "student_list_email"),
            (Audience.STAFF, "staff_list_email"),
        ):
            value = clean_email(data.get(key))
            data[key] = value
            if value is not None:
                problem = self._list_problem(audience, value, domain_map)
                if problem:
                    raise HTTPException(
                        400, f"{LIST_LABELS[audience].capitalize()} group address: {problem}"
                    )
        if data.get("auto_enabled") and not (data["student_list_email"] or data["staff_list_email"]):
            raise HTTPException(400, "Set at least one group address before turning automatic sending on")

        row = await self.get_settings()
        before = snapshot(row, SETTINGS_FIELDS)
        for key, value in data.items():
            setattr(row, key, value)
        row.updated_by_id = current_user.id
        await self.db.commit()
        await self.db.refresh(row)
        details = format_changes(before, snapshot(row, SETTINGS_FIELDS))
        if details:
            await self.audit.log(
                current_user, "digest.settings_update", "digest_settings", 1,
                "Email digest settings", details=details,
            )
        return row

    async def _targets(self, scope: str, settings_row: DigestSettings | None = None) -> list[Target]:
        row = settings_row or await self.get_settings()
        domain_map = await self._domain_map()
        emails = {Audience.STUDENT: row.student_list_email, Audience.STAFF: row.staff_list_email}
        targets = []
        for audience in AUDIENCES:
            if scope != "all" and audience.value != scope:
                continue
            email = emails[audience]
            targets.append(Target(audience, email, self._list_problem(audience, email, domain_map)))
        return targets

    @staticmethod
    def _published_at():
        return func.coalesce(Notice.reviewed_at, Notice.created_at)

    @staticmethod
    def _notice_query():
        return select(Notice).options(selectinload(Notice.category), selectinload(Notice.org_unit))

    @staticmethod
    def _sent_notice_ids():
        return (
            select(DigestRunNotice.notice_id)
            .join(DigestRun, DigestRun.id == DigestRunNotice.run_id)
            .where(DigestRun.status.in_(("completed", "running")))
        )

    async def _last_window_end(self) -> datetime | None:
        result = await self.db.execute(
            select(func.max(DigestRun.window_end)).where(
                DigestRun.kind.in_(("auto", "digest")), DigestRun.status == "completed"
            )
        )
        return result.scalar_one_or_none()

    async def _select_notices(self, kind: str, notice_ids: list[int] | None):
        if kind == "urgent":
            if not notice_ids:
                return [], None, None
            statement = (
                self._notice_query()
                .where(Notice.id.in_(notice_ids), Notice.status == NoticeStatus.APPROVED)
                .order_by(self._published_at().desc())
            )
            result = await self.db.execute(statement)
            return list(result.scalars().all()), None, None

        now = datetime.now(timezone.utc)
        last_end = await self._last_window_end()
        since = last_end or (now - timedelta(days=DEFAULT_WINDOW_DAYS))
        published = self._published_at()
        statement = (
            self._notice_query()
            .where(
                Notice.status == NoticeStatus.APPROVED,
                published > since,
                published <= now,
                Notice.id.not_in(self._sent_notice_ids()),
            )
            .order_by(Notice.is_pinned_feed.desc(), published.desc())
        )
        result = await self.db.execute(statement)
        return list(result.scalars().all()), since, now

    async def _load_notices(self, notice_ids: list[int]) -> list[Notice]:
        if not notice_ids:
            return []
        statement = (
            self._notice_query()
            .where(Notice.id.in_(notice_ids))
            .order_by(Notice.is_pinned_feed.desc(), self._published_at().desc())
        )
        result = await self.db.execute(statement)
        return list(result.scalars().all())

    async def _upcoming_events(self) -> list[Event]:
        now = datetime.now(timezone.utc)
        statement = (
            select(Event)
            .options(selectinload(Event.org_unit))
            .where(
                Event.status == NoticeStatus.APPROVED,
                Event.start_date >= now,
                Event.start_date <= now + timedelta(days=EVENT_WINDOW_DAYS),
            )
            .order_by(Event.start_date.asc())
            .limit(10)
        )
        result = await self.db.execute(statement)
        return list(result.scalars().all())

    @staticmethod
    def _default_subject(kind: str, count: int, shown: list[Notice]) -> str:
        if kind == "urgent":
            if count == 1 and shown:
                return f"[Urgent] {shown[0].title}"[:200]
            return f"[Urgent] {count} important notices"
        plural = "s" if count != 1 else ""
        return f"{count} notice{plural} you may have missed this week"

    @staticmethod
    def _default_intro(kind: str, count: int) -> str:
        if kind == "urgent":
            if count == 1:
                return "An important notice has just been published on the JKUAT Noticeboard."
            return "Important notices have just been published on the JKUAT Noticeboard."
        return "Here are some of the notices you might have missed this week."

    def _build_variants(
        self,
        notices: list[Notice],
        events: list[Event],
        settings_row: DigestSettings,
        kind: str,
        subject_override: str | None,
        intro: str | None,
        audiences: list[Audience],
    ) -> dict[Audience, dict]:
        max_notices = settings_row.max_notices
        excerpt_length = settings_row.excerpt_length
        variants: dict[Audience, dict] = {}
        for audience in audiences:
            visible = [n for n in notices if audience_allows(n.audience, audience)]
            if not visible:
                continue
            limit = min(len(visible), 10) if kind == "urgent" else max_notices
            shown = visible[:limit]
            digest_notices = [
                DigestNotice(
                    id=n.id,
                    title=n.title,
                    excerpt=make_excerpt(n.body, excerpt_length),
                    category=n.category.name if n.category else None,
                    org_unit=n.org_unit.name if n.org_unit else None,
                    published_at=n.reviewed_at or n.created_at,
                    pinned=n.is_pinned_feed,
                )
                for n in shown
            ]
            digest_events = [
                DigestEvent(
                    id=e.id, title=e.title, start_date=e.start_date, location=e.location,
                    org_unit=e.org_unit.name if e.org_unit else None,
                )
                for e in events
                if audience_allows(e.audience, audience)
            ][:5]
            variants[audience] = {
                "subject": subject_override or self._default_subject(kind, len(visible), shown),
                "intro": intro or self._default_intro(kind, len(visible)),
                "notices": digest_notices,
                "hidden": len(visible) - len(shown),
                "events": digest_events,
                "urgent": kind == "urgent",
                "count": len(visible),
            }
        return variants

    async def recent_notices(self, days: int = 30, limit: int = 100) -> list[dict]:
        since = datetime.now(timezone.utc) - timedelta(days=days)
        sent = set((await self.db.execute(self._sent_notice_ids())).scalars().all())
        published = self._published_at()
        statement = (
            select(Notice)
            .options(selectinload(Notice.category))
            .where(Notice.status == NoticeStatus.APPROVED, published > since)
            .order_by(published.desc())
            .limit(limit)
        )
        result = await self.db.execute(statement)
        return [
            {
                "id": n.id,
                "title": n.title,
                "audience": n.audience.value,
                "category": n.category.name if n.category else None,
                "published_at": n.reviewed_at or n.created_at,
                "already_sent": n.id in sent,
            }
            for n in result.scalars().all()
        ]

    async def preview(
        self, kind: str, notice_ids: list[int], subject: str | None, intro: str | None, scope: str
    ) -> dict:
        settings_row = await self.get_settings()
        notices, since, until = await self._select_notices(kind, notice_ids)
        events = (
            await self._upcoming_events() if settings_row.include_events and kind != "urgent" else []
        )
        variants = self._build_variants(
            notices, events, settings_row, kind, subject, intro, list(AUDIENCES)
        )
        targets = await self._targets(scope, settings_row)
        site = settings.frontend_base_url

        out = []
        for target in targets:
            variant = variants.get(target.audience)
            entry = {
                "audience": target.audience.value,
                "list_email": target.email,
                "problem": target.problem,
                "notice_count": 0,
                "subject": None,
                "html": None,
                "text": None,
                "will_send": False,
            }
            if variant is None:
                entry["problem"] = target.problem or "None of these notices can be seen by this audience"
            else:
                message = build_message(
                    variant["subject"], variant["intro"], variant["notices"], variant["hidden"],
                    variant["events"], site, LIST_LABELS[target.audience], variant["urgent"],
                )
                entry["subject"] = message.subject
                entry["notice_count"] = variant["count"]
                entry["html"] = message.html
                entry["text"] = message.text
                entry["will_send"] = target.problem is None
            out.append(entry)

        return {
            "notice_count": len(notices),
            "window_start": since,
            "window_end": until,
            "variants": out,
            "lists_total": sum(1 for entry in out if entry["will_send"]),
        }

    async def send_test(
        self, kind: str, notice_ids: list[int], subject: str | None, intro: str | None,
        audience: str, current_user: User,
    ) -> None:
        settings_row = await self.get_settings()
        notices, _, _ = await self._select_notices(kind, notice_ids)
        events = (
            await self._upcoming_events() if settings_row.include_events and kind != "urgent" else []
        )
        target = Audience(audience)
        variants = self._build_variants(notices, events, settings_row, kind, subject, intro, [target])
        variant = variants.get(target)
        if variant is None:
            raise HTTPException(400, f"There is nothing in this digest that {audience} readers can see")
        message = build_message(
            variant["subject"], variant["intro"], variant["notices"], variant["hidden"],
            variant["events"], settings.frontend_base_url, LIST_LABELS[target], variant["urgent"],
        )
        mime = to_mime(current_user.email, f"[TEST] {message.subject}", message)
        session = SmtpSession()
        try:
            await session.open()
            await session.send(mime)
        except Exception as exc:
            raise HTTPException(502, f"Could not send the test email: {str(exc)[:200]}")
        finally:
            await session.close()
        await self.audit.log(
            current_user, "digest.test", "digest_run", None, message.subject[:255],
            details=f"sent to {current_user.email} ({audience} version)",
        )

    async def _clear_stale_runs(self) -> None:
        now = datetime.now(timezone.utc)
        cutoff = now - timedelta(minutes=STALE_RUN_MINUTES)
        sent_any = or_(DigestRun.student_result == "sent", DigestRun.staff_result == "sent")
        await self.db.execute(
            update(DigestRun)
            .where(DigestRun.status == "running", DigestRun.started_at < cutoff, sent_any)
            .values(
                status="completed",
                finished_at=now,
                note="Interrupted after at least one list was sent. Check the result for each list.",
            )
        )
        await self.db.execute(
            update(DigestRun)
            .where(DigestRun.status == "running", DigestRun.started_at < cutoff)
            .values(
                status="failed",
                finished_at=now,
                slot_key=None,
                note="Interrupted before anything was sent (the server may have restarted)",
            )
        )
        await self.db.commit()

    async def _active_run_id(self) -> int | None:
        result = await self.db.execute(
            select(DigestRun.id).where(DigestRun.status == "running").limit(1)
        )
        return result.scalar_one_or_none()

    async def _plan(
        self, kind: str, notice_ids: list[int] | None, subject: str | None, intro: str | None, scope: str
    ) -> Plan:
        settings_row = await self.get_settings()
        notices, since, until = await self._select_notices(kind, notice_ids)
        if not notices:
            raise NothingToSend(
                "Select at least one published notice."
                if kind == "urgent"
                else "There are no new notices to send."
            )
        events = (
            await self._upcoming_events() if settings_row.include_events and kind != "urgent" else []
        )
        variants = self._build_variants(
            notices, events, settings_row, kind, subject, intro, list(AUDIENCES)
        )
        targets = await self._targets(scope, settings_row)
        deliverable = [t for t in targets if t.problem is None and t.audience in variants]
        if not deliverable:
            problems = [
                f"{LIST_LABELS[t.audience].capitalize()}: {t.problem}" for t in targets if t.problem
            ]
            raise NothingToSend(
                "; ".join(problems) if problems else "None of these notices can be seen by the chosen audience."
            )
        return Plan([n.id for n in notices], since, until, len(deliverable))

    async def _finish_run(self, run_id: int, status: str, note: str | None) -> None:
        await self.db.execute(
            update(DigestRun)
            .where(DigestRun.id == run_id)
            .values(status=status, note=note, finished_at=datetime.now(timezone.utc))
        )
        await self.db.commit()

    async def _create_run(
        self, kind: str, notice_ids: list[int] | None, subject: str | None, intro: str | None,
        scope: str, actor_id: int | None, slot_key: str | None,
    ) -> int:
        await self._clear_stale_runs()
        if await self._active_run_id() is not None:
            raise Busy()

        run_id = None
        if slot_key is not None:
            claim = DigestRun(
                kind=kind, status="running", slot_key=slot_key, scope=scope, triggered_by_id=actor_id,
            )
            self.db.add(claim)
            try:
                await self.db.flush()
            except IntegrityError:
                await self.db.rollback()
                raise Busy()
            run_id = claim.id
            await self.db.commit()

        try:
            plan = await self._plan(kind, notice_ids, subject, intro, scope)
        except NothingToSend as exc:
            if run_id is not None:
                await self._finish_run(run_id, "skipped", str(exc))
            raise

        if run_id is None:
            run = DigestRun(
                kind=kind, status="running", subject=subject, intro=intro, scope=scope,
                triggered_by_id=actor_id, window_start=plan.window_start,
                window_end=plan.window_end, recipients_total=plan.lists_total,
            )
            self.db.add(run)
            await self.db.flush()
            run_id = run.id
        else:
            await self.db.execute(
                update(DigestRun).where(DigestRun.id == run_id).values(
                    subject=subject, intro=intro, window_start=plan.window_start,
                    window_end=plan.window_end, recipients_total=plan.lists_total,
                )
            )
        for notice_id in plan.notice_ids:
            self.db.add(DigestRunNotice(run_id=run_id, notice_id=notice_id))
        await self.db.commit()
        return run_id

    async def start_manual_run(
        self, kind: str, notice_ids: list[int], subject: str | None, intro: str | None,
        scope: str, current_user: User, background_tasks: BackgroundTasks,
    ) -> dict:
        try:
            run_id = await self._create_run(
                kind, notice_ids, subject, intro, scope, current_user.id, None
            )
        except Busy:
            raise HTTPException(409, "A digest is already being sent. Wait for it to finish.")
        except NothingToSend as exc:
            raise HTTPException(400, str(exc))
        background_tasks.add_task(execute_run, run_id)
        return await self.get_run(run_id)

    async def start_auto_run(self, slot_key: str) -> int | None:
        try:
            return await self._create_run("auto", None, None, None, "all", None, slot_key)
        except Busy:
            return None
        except NothingToSend as exc:
            await self.audit.log(
                None, "digest.auto_skipped", "digest_run", None, "Weekly digest", details=str(exc),
            )
            return None

    async def start_system_digest(self) -> int:
        return await self._create_run("digest", None, None, None, "all", None, None)

    async def _send_with_retry(self, mime: EmailMessage) -> str | None:
        last_error = "unknown error"
        for delay in SEND_ATTEMPT_DELAYS:
            if delay:
                await asyncio.sleep(delay)
            session = SmtpSession()
            try:
                await session.open()
                await session.send(mime)
                return None
            except Exception as exc:
                last_error = str(exc) or exc.__class__.__name__
            finally:
                await session.close()
        return last_error[:250]

    async def _execute_inner(self, run_id: int) -> None:
        run = await self.db.get(DigestRun, run_id)
        if run is None:
            return
        kind = run.kind
        scope = run.scope
        custom_subject = run.subject
        intro = run.intro
        triggered_by_id = run.triggered_by_id

        settings_row = await self.get_settings()
        include_events = settings_row.include_events and kind != "urgent"
        site = settings.frontend_base_url.rstrip("/")

        id_rows = await self.db.execute(
            select(DigestRunNotice.notice_id).where(DigestRunNotice.run_id == run_id)
        )
        notice_ids = list(id_rows.scalars().all())
        notices = await self._load_notices(notice_ids)
        events = await self._upcoming_events() if include_events else []
        variants = self._build_variants(
            notices, events, settings_row, kind, custom_subject, intro, list(AUDIENCES)
        )
        computed_subject = custom_subject
        if not computed_subject and variants:
            computed_subject = next(iter(variants.values()))["subject"][:255]

        targets = await self._targets(scope, settings_row)
        sent = 0
        failed = 0
        skipped = 0
        outcomes: dict[Audience, str] = {}

        for target in targets:
            variant = variants.get(target.audience)
            if target.problem is not None:
                outcome = f"skipped: {target.problem}"
                skipped += 1
            elif variant is None:
                outcome = "skipped: nothing in this digest is visible to this audience"
                skipped += 1
            else:
                message = build_message(
                    variant["subject"], variant["intro"], variant["notices"], variant["hidden"],
                    variant["events"], site, LIST_LABELS[target.audience], variant["urgent"],
                )
                mime = to_mime(target.email, message.subject, message)
                error = await self._send_with_retry(mime)
                if error is None:
                    outcome = "sent"
                    sent += 1
                else:
                    outcome = f"failed: {error}"
                    failed += 1

            outcomes[target.audience] = outcome[:255]
            column = "student_result" if target.audience == Audience.STUDENT else "staff_result"
            progress = {
                column: outcomes[target.audience],
                "sent_count": sent,
                "failed_count": failed,
                "skipped_count": skipped,
            }
            await self.db.execute(update(DigestRun).where(DigestRun.id == run_id).values(**progress))
            await self.db.commit()

        notes = []
        for audience, outcome in outcomes.items():
            label = LIST_LABELS[audience]
            if outcome.startswith("failed"):
                notes.append(
                    f"The {label} list was not sent. Use an urgent push for the {label} audience to resend."
                )
            elif outcome.startswith("skipped"):
                notes.append(f"The {label} list was skipped.")
        if sent == 0 and failed > 0:
            notes.append("Check the SMTP settings and that each list accepts mail from the sender address.")

        status = "completed" if sent > 0 else "failed"
        await self.db.execute(
            update(DigestRun)
            .where(DigestRun.id == run_id)
            .values(
                status=status,
                subject=computed_subject,
                note=" ".join(notes) or None,
                finished_at=datetime.now(timezone.utc),
            )
        )
        await self.db.commit()

        actor = await self.db.get(User, triggered_by_id) if triggered_by_id else None
        await self.audit.log(
            actor,
            "digest.send" if sent > 0 else "digest.failed",
            "digest_run",
            run_id,
            (computed_subject or "Email digest")[:255],
            details=(
                f"kind: {kind}; lists sent: {sent}; failed: {failed}; skipped: {skipped}; "
                f"notices: {len(notice_ids)}"
            ),
        )

    @staticmethod
    def _run_dict(run: DigestRun) -> dict:
        return {
            "id": run.id,
            "kind": run.kind,
            "status": run.status,
            "subject": run.subject,
            "intro": run.intro,
            "scope": run.scope,
            "window_start": run.window_start,
            "window_end": run.window_end,
            "recipients_total": run.recipients_total,
            "sent_count": run.sent_count,
            "failed_count": run.failed_count,
            "skipped_count": run.skipped_count,
            "student_result": run.student_result,
            "staff_result": run.staff_result,
            "note": run.note,
            "started_at": run.started_at,
            "finished_at": run.finished_at,
            "triggered_by": run.triggered_by.full_name if run.triggered_by else None,
            "notices": [
                {"id": item.notice.id, "title": item.notice.title}
                for item in run.items
                if item.notice is not None
            ],
        }

    @staticmethod
    def _run_options():
        return (
            selectinload(DigestRun.triggered_by),
            selectinload(DigestRun.items).selectinload(DigestRunNotice.notice),
        )

    async def list_runs(self, limit: int, offset: int) -> list[dict]:
        statement = (
            select(DigestRun)
            .options(*self._run_options())
            .order_by(DigestRun.started_at.desc(), DigestRun.id.desc())
            .limit(limit)
            .offset(offset)
        )
        result = await self.db.execute(statement)
        return [self._run_dict(run) for run in result.scalars().all()]

    async def get_run(self, run_id: int) -> dict:
        statement = select(DigestRun).options(*self._run_options()).where(DigestRun.id == run_id)
        result = await self.db.execute(statement)
        run = result.scalars().first()
        if run is None:
            raise HTTPException(404, "Run not found")
        return self._run_dict(run)

    @staticmethod
    def _run_brief(run: DigestRun | None) -> dict | None:
        if run is None:
            return None
        return {
            "id": run.id,
            "kind": run.kind,
            "status": run.status,
            "started_at": run.started_at,
            "finished_at": run.finished_at,
            "sent_count": run.sent_count,
            "failed_count": run.failed_count,
            "window_end": run.window_end,
        }

    async def overview(self) -> dict:
        settings_row = await self.get_settings()
        now = datetime.now(timezone.utc)
        last_end = await self._last_window_end()
        since = last_end or (now - timedelta(days=DEFAULT_WINDOW_DAYS))
        published = self._published_at()

        pending_result = await self.db.execute(
            select(func.count(Notice.id)).where(
                Notice.status == NoticeStatus.APPROVED,
                published > since,
                published <= now,
                Notice.id.not_in(self._sent_notice_ids()),
            )
        )
        pending_count = pending_result.scalar_one()

        async def latest(*conditions):
            result = await self.db.execute(
                select(DigestRun).where(*conditions).order_by(DigestRun.started_at.desc()).limit(1)
            )
            return result.scalars().first()

        last_digest = await latest(DigestRun.kind.in_(("auto", "digest")), DigestRun.status == "completed")
        last_any = await latest(DigestRun.status == "completed")
        active = await latest(DigestRun.status == "running")

        next_run = None
        if settings_row.auto_enabled:
            local_now = datetime.now(EAT)
            candidate = next_slot(local_now, settings_row.send_day, settings_row.send_hour)
            paused = settings_row.paused_until
            if paused is not None and candidate.date() <= paused:
                resume = datetime.combine(paused + timedelta(days=1), time(0, 0), tzinfo=EAT)
                candidate = next_slot(resume, settings_row.send_day, settings_row.send_hour)
            next_run = candidate

        domain_map = await self._domain_map()
        lists = []
        for audience, email in (
            (Audience.STUDENT, settings_row.student_list_email),
            (Audience.STAFF, settings_row.staff_list_email),
        ):
            lists.append({
                "audience": audience.value,
                "email": email,
                "problem": self._list_problem(audience, email, domain_map),
            })

        return {
            "settings": {field: getattr(settings_row, field) for field in SETTINGS_FIELDS},
            "scheduler_running": settings.digest_scheduler_enabled,
            "lists": lists,
            "last_digest": self._run_brief(last_digest),
            "last_any": self._run_brief(last_any),
            "active_run": self._run_brief(active),
            "pending_notice_count": pending_count,
            "pending_since": since,
            "next_run": next_run,
        }


async def execute_run(run_id: int) -> None:
    error = None
    async with AsyncSessionLocal() as db:
        try:
            await DigestService(db)._execute_inner(run_id)
        except Exception as exc:
            logger.exception("Digest run %s failed", run_id)
            error = str(exc)

    if error is not None:
        async with AsyncSessionLocal() as db:
            await db.execute(
                update(DigestRun)
                .where(DigestRun.id == run_id, DigestRun.status == "running")
                .values(
                    status="failed",
                    finished_at=datetime.now(timezone.utc),
                    note=f"Unexpected error: {error}"[:500],
                )
            )
            await db.commit()
            await AuditLogService(db).log(
                None, "digest.failed", "digest_run", run_id, "Email digest",
                details=f"unexpected error: {error}"[:500],
            )


async def run_schedule_check() -> int | None:
    async with AsyncSessionLocal() as db:
        service = DigestService(db)
        row = await service.get_settings()
        auto_enabled = row.auto_enabled
        paused_until = row.paused_until
        send_day = row.send_day
        send_hour = row.send_hour
        if not auto_enabled:
            return None
        local_now = datetime.now(EAT)
        if paused_until is not None and local_now.date() <= paused_until:
            return None
        if local_now.weekday() != send_day:
            return None
        if not (send_hour <= local_now.hour < send_hour + SCHEDULE_GRACE_HOURS):
            return None
        slot_key = f"auto-{local_now.date().isoformat()}"
        run_id = await service.start_auto_run(slot_key)

    if run_id is not None:
        await execute_run(run_id)
    return run_id


async def scheduler_loop() -> None:
    while True:
        try:
            await run_schedule_check()
        except Exception:
            logger.exception("Digest scheduler check failed")
        await asyncio.sleep(SCHEDULER_INTERVAL_SECONDS)