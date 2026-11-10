from datetime import date, datetime

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Index, Integer, String, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

from typing import TYPE_CHECKING
if TYPE_CHECKING:
    from app.models.notice import Notice
    from app.models.user import User


class DigestSettings(Base):
    __tablename__ = "digest_settings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    auto_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    send_day: Mapped[int] = mapped_column(Integer, nullable=False, default=4)
    send_hour: Mapped[int] = mapped_column(Integer, nullable=False, default=10)
    max_notices: Mapped[int] = mapped_column(Integer, nullable=False, default=3)
    excerpt_length: Mapped[int] = mapped_column(Integer, nullable=False, default=160)
    include_events: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    paused_until: Mapped[date | None] = mapped_column(Date, nullable=True)
    student_list_email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    staff_list_email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    updated_by_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class DigestRun(Base):
    __tablename__ = "digest_runs"
    __table_args__ = (
        Index("ix_digest_runs_started_at", "started_at"),
        Index("ix_digest_runs_kind_status", "kind", "status"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    kind: Mapped[str] = mapped_column(String(20), nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="running")
    slot_key: Mapped[str | None] = mapped_column(String(50), nullable=True, unique=True)
    triggered_by_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    subject: Mapped[str | None] = mapped_column(String(255), nullable=True)
    intro: Mapped[str | None] = mapped_column(Text, nullable=True)
    scope: Mapped[str] = mapped_column(String(20), nullable=False, default="all")
    window_start: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    window_end: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    recipients_total: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    sent_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    failed_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    skipped_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    student_result: Mapped[str | None] = mapped_column(String(255), nullable=True)
    staff_result: Mapped[str | None] = mapped_column(String(255), nullable=True)
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    triggered_by: Mapped["User | None"] = relationship("User")
    items: Mapped[list["DigestRunNotice"]] = relationship(
        "DigestRunNotice", cascade="all, delete-orphan"
    )


class DigestRunNotice(Base):
    __tablename__ = "digest_run_notices"
    __table_args__ = (
        UniqueConstraint("run_id", "notice_id", name="uq_digest_run_notice"),
        Index("ix_digest_run_notices_notice_id", "notice_id"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    run_id: Mapped[int] = mapped_column(ForeignKey("digest_runs.id", ondelete="CASCADE"), nullable=False)
    notice_id: Mapped[int] = mapped_column(ForeignKey("notices.id", ondelete="CASCADE"), nullable=False)

    notice: Mapped["Notice"] = relationship("Notice")