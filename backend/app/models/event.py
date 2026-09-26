from datetime import datetime
from sqlalchemy import Integer, String, Text, ForeignKey, DateTime, Enum, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base

from typing import TYPE_CHECKING
if TYPE_CHECKING:
    from app.models.user import User
    from app.models.org_unit import OrgUnit

from app.models.notice import NoticeStatus, Audience


class Event(Base):
    __tablename__ = "events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    start_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    end_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    location: Mapped[str | None] = mapped_column(String(255), nullable=True)
    audience: Mapped[Audience] = mapped_column(nullable=False, default=Audience.PUBLIC)

    image_url: Mapped[str | None] = mapped_column(String(255), nullable=True)
    image_file_name: Mapped[str | None] = mapped_column(String(255), nullable=True)

    org_unit_id: Mapped[int] = mapped_column(Integer, ForeignKey("org_units.id"), nullable=False)
    author_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)

    status: Mapped[NoticeStatus] = mapped_column(
        Enum(NoticeStatus, native_enum=False), nullable=False, default=NoticeStatus.PENDING
    )
    reviewed_by_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("users.id"), nullable=True)
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    rejection_notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    org_unit: Mapped["OrgUnit"] = relationship("OrgUnit")
    author: Mapped["User"] = relationship("User", foreign_keys=[author_id])
    reviewed_by: Mapped["User | None"] = relationship("User", foreign_keys=[reviewed_by_id])