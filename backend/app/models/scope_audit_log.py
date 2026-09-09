import enum
from datetime import datetime
from sqlalchemy import Integer, String, DateTime, func, ForeignKey, Enum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base

from typing import TYPE_CHECKING
if TYPE_CHECKING:
    from app.models.user import User


class ScopeType(enum.Enum):
    DEPARTMENT = "department"
    CLUB = "club"


class ScopeAction(enum.Enum):
    GRANTED = "granted"
    REVOKED = "revoked"


class ScopeAuditLog(Base):
    __tablename__ = "scope_audit_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    scope_type: Mapped[ScopeType] = mapped_column(Enum(ScopeType, native_enum=False), nullable=False)
    scope_id: Mapped[int] = mapped_column(Integer, nullable=False)
    scope_name: Mapped[str] = mapped_column(String(255), nullable=False)
    action: Mapped[ScopeAction] = mapped_column(Enum(ScopeAction, native_enum=False), nullable=False)
    performed_by_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user: Mapped["User"] = relationship(foreign_keys=[user_id])
    performed_by: Mapped["User"] = relationship(foreign_keys=[performed_by_id])