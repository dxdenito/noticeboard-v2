import enum
from datetime import datetime
from app.core.database import Base
from sqlalchemy import Integer, String, Text, ForeignKey, Enum, Boolean, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.category import Category
    from app.models.org_unit import OrgUnit
    from app.models.attachment import Attachment


class Audience(enum.Enum):
    PUBLIC = "public"
    STUDENT = "student"
    STAFF = "staff"


class NoticeStatus(enum.Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"


class Notice(Base):
    __tablename__ = "notices"
    id: Mapped[int] = mapped_column(Integer, autoincrement=True, primary_key=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    author_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id"), nullable=False
    )
    audience: Mapped[Audience] = mapped_column(
        Enum(Audience, native_enum=False), nullable=False
    )
    org_unit_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("org_units.id"), nullable=True
    )
    category_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("categories.id"), nullable=False
    )
    status: Mapped[NoticeStatus] = mapped_column(
        Enum(NoticeStatus, native_enum=False),
        nullable=False,
        default=NoticeStatus.PENDING,
    )
    is_pinned_site: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    is_pinned_feed: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    expiry_date: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    author: Mapped["User"] = relationship(back_populates="notices")
    org_unit: Mapped["OrgUnit | None"] = relationship(back_populates="notices")
    category: Mapped["Category"] = relationship(back_populates="notices")
    attachments: Mapped[list["Attachment"]] = relationship(back_populates="notice")