import enum
from datetime import datetime
from sqlalchemy import Integer, String, DateTime, func, ForeignKey, Enum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base

from typing import TYPE_CHECKING
if TYPE_CHECKING:
    from app.models.user import User
    from app.models.org_unit import OrgUnit


class ScopeType(enum.Enum):
    POST = "post"
    APPROVE = "approve"


class AdminScope(Base):
    __tablename__ = "admin_scopes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    admin_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    org_unit_id: Mapped[int] = mapped_column(ForeignKey("org_units.id"), nullable=False)
    scope_type: Mapped[ScopeType] = mapped_column(Enum(ScopeType, native_enum=False), nullable=False)
    granted_by_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    granted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    admin: Mapped["User"] = relationship("User", foreign_keys=[admin_id])
    granted_by: Mapped["User"] = relationship("User", foreign_keys=[granted_by_id])
    org_unit: Mapped["OrgUnit"] = relationship("OrgUnit")