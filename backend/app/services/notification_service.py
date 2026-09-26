from fastapi import BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession

from app.repositories.notification_repository import NotificationRepository
from app.repositories.user_repository import UserRepository
from app.services.permission_service import PermissionService
from app.services.institutional_domain_service import InstitutionalDomainService
from app.services.email_service import EmailService
from app.models.notification import Notification
from app.models.notice import Notice
from app.models.user import User

REVIEWER_CANDIDATE_ROLES = ("super_admin", "corporate_super_admin", "ict_sub_admin", "corporate_admin")
EMAIL_REVIEWER_ROLES = ("corporate_super_admin", "corporate_admin")


class NotificationService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.notification_repo = NotificationRepository(db)
        self.user_repo = UserRepository(db)
        self.permission_service = PermissionService(db)
        self.institutional_domain_service = InstitutionalDomainService(db)
        self.email_service = EmailService()

    async def _create(self, recipient_id: int, type_: str, title: str, message: str, notice_id: int | None = None, event_id: int | None = None) -> None:
        notification = Notification(
            recipient_id=recipient_id, type=type_, title=title, message=message, notice_id=notice_id, event_id=event_id,
        )
        await self.notification_repo.create(notification)

    async def _send_email_or_flag(self, user: User, subject: str, body: str, background_tasks: BackgroundTasks) -> None:
        resolved = await self.institutional_domain_service.resolve_audience(user.email)
        if resolved is not None:
            background_tasks.add_task(self.email_service.send, user.email, subject, body)
        else:
            await self._create(
                recipient_id=user.id,
                type_="email.blocked",
                title="Email delivery issue",
                message="We couldn't email you about a recent update because your account's email isn't recognized as an institutional address. Please contact a system administrator to correct it.",
            )

    async def notify_approved(self, notice: Notice, background_tasks: BackgroundTasks) -> None:
        await self._create(
            recipient_id=notice.author_id,
            type_="notice.approved",
            title="Notice approved",
            message=f'Your notice "{notice.title}" was approved and is now live.',
            notice_id=notice.id,
        )
        body = (
            f"Hi {notice.author.full_name},\n\n"
            f'Your notice "{notice.title}" has been approved and is now live on the Noticeboard.\n'
        )
        await self._send_email_or_flag(notice.author, "Your notice was approved", body, background_tasks)

    async def notify_rejected(self, notice: Notice, background_tasks: BackgroundTasks) -> None:
        message = f'Your notice "{notice.title}" was rejected.'
        if notice.rejection_notes:
            message += f' Reason: {notice.rejection_notes}'
        await self._create(
            recipient_id=notice.author_id,
            type_="notice.rejected",
            title="Notice rejected",
            message=message,
            notice_id=notice.id,
        )
        body = (
            f"Hi {notice.author.full_name},\n\n"
            f'Your notice "{notice.title}" was rejected.\n'
        )
        if notice.rejection_notes:
            body += f"\nReason given:\n{notice.rejection_notes}\n"
        await self._send_email_or_flag(notice.author, "Your notice was rejected", body, background_tasks)

    async def notify_pending_review(self, notice: Notice, background_tasks: BackgroundTasks) -> None:
        candidates = []
        for role_name in REVIEWER_CANDIDATE_ROLES:
            candidates += await self.user_repo.list_by_role_name(role_name, limit=1000)

        for reviewer in candidates:
            if reviewer.id == notice.author_id:
                continue
            if not await self.permission_service.can_approve_for(reviewer, notice.org_unit_id):
                continue

            await self._create(
                recipient_id=reviewer.id,
                type_="notice.pending_review",
                title="New notice awaiting review",
                message=f'"{notice.title}" needs your review.',
                notice_id=notice.id,
            )

            if reviewer.role.name in EMAIL_REVIEWER_ROLES:
                body = (
                    f"Hi {reviewer.full_name},\n\n"
                    f'A new notice, "{notice.title}", is awaiting your review on the Noticeboard.\n'
                )
                await self._send_email_or_flag(reviewer, "A notice needs your review", body, background_tasks)

    async def notify_event_approved(self, event, background_tasks: BackgroundTasks) -> None:
        await self._create(
            recipient_id=event.author_id,
            type_="event.approved",
            title="Event approved",
            message=f'Your event "{event.title}" was approved and is now live.',
            event_id=event.id,
        )
        body = (
            f"Hi {event.author.full_name},\n\n"
            f'Your event "{event.title}" has been approved and is now live on the Noticeboard.\n'
        )
        await self._send_email_or_flag(event.author, "Your event was approved", body, background_tasks)

    async def notify_event_rejected(self, event, background_tasks: BackgroundTasks) -> None:
        message = f'Your event "{event.title}" was rejected.'
        if event.rejection_notes:
            message += f' Reason: {event.rejection_notes}'
        await self._create(
            recipient_id=event.author_id,
            type_="event.rejected",
            title="Event rejected",
            message=message,
            event_id=event.id,
        )
        body = (
            f"Hi {event.author.full_name},\n\n"
            f'Your event "{event.title}" was rejected.\n'
        )
        if event.rejection_notes:
            body += f"\nReason given:\n{event.rejection_notes}\n"
        await self._send_email_or_flag(event.author, "Your event was rejected", body, background_tasks)

    async def notify_event_pending_review(self, event, background_tasks: BackgroundTasks) -> None:
        candidates = []
        for role_name in REVIEWER_CANDIDATE_ROLES:
            candidates += await self.user_repo.list_by_role_name(role_name, limit=1000)

        for reviewer in candidates:
            if reviewer.id == event.author_id:
                continue
            if not await self.permission_service.can_approve_for(reviewer, event.org_unit_id):
                continue

            await self._create(
                recipient_id=reviewer.id,
                type_="event.pending_review",
                title="New event awaiting review",
                message=f'"{event.title}" needs your review.',
                event_id=event.id,
            )

            if reviewer.role.name in EMAIL_REVIEWER_ROLES:
                body = (
                    f"Hi {reviewer.full_name},\n\n"
                    f'A new event, "{event.title}", is awaiting your review on the Noticeboard.\n'
                )
                await self._send_email_or_flag(reviewer, "An event needs your review", body, background_tasks)