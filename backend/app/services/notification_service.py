from sqlalchemy.ext.asyncio import AsyncSession

from app.repositories.notification_repository import NotificationRepository
from app.repositories.user_repository import UserRepository
from app.services.permission_service import PermissionService
from app.models.notification import Notification
from app.models.notice import Notice

REVIEWER_CANDIDATE_ROLES = ("super_admin", "corporate_super_admin", "ict_sub_admin", "corporate_admin")


class NotificationService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.notification_repo = NotificationRepository(db)
        self.user_repo = UserRepository(db)
        self.permission_service = PermissionService(db)

    async def _create(self, recipient_id: int, type_: str, title: str, message: str, notice_id: int | None = None) -> None:
        notification = Notification(
            recipient_id=recipient_id, type=type_, title=title, message=message, notice_id=notice_id,
        )
        await self.notification_repo.create(notification)

    async def notify_approved(self, notice: Notice) -> None:
        await self._create(
            recipient_id=notice.author_id,
            type_="notice.approved",
            title="Notice approved",
            message=f'Your notice "{notice.title}" was approved and is now live.',
            notice_id=notice.id,
        )

    async def notify_rejected(self, notice: Notice) -> None:
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

    async def notify_pending_review(self, notice: Notice) -> None:
        candidates = []
        for role_name in REVIEWER_CANDIDATE_ROLES:
            candidates += await self.user_repo.list_by_role_name(role_name, limit=1000)

        for reviewer in candidates:
            if reviewer.id == notice.author_id:
                continue
            if await self.permission_service.can_approve_for(reviewer, notice.org_unit_id):
                await self._create(
                    recipient_id=reviewer.id,
                    type_="notice.pending_review",
                    title="New notice awaiting review",
                    message=f'"{notice.title}" needs your review.',
                    notice_id=notice.id,
                )