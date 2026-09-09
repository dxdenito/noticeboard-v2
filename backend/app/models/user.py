from datetime import datetime
from sqlalchemy import Integer, String, DateTime, func, ForeignKey, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base

from typing import TYPE_CHECKING
if TYPE_CHECKING:
    from app.models.role import Role
    from app.models.notice import Notice
    from app.models.admin_scope import AdminScope


class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(
        Integer, primary_key=True, autoincrement=True, index=True
    )
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    role_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("roles.id"), nullable=False
    )
    requires_approval: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    can_approve: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    can_post: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    can_manage_users: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    is_active: Mapped[bool] = mapped_column(default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
    role: Mapped["Role"] = relationship("Role", back_populates="users")
    notices: Mapped[list["Notice"]] = relationship(back_populates="author")
    scopes: Mapped[list["AdminScope"]] = relationship(
        "AdminScope", foreign_keys="[AdminScope.admin_id]", back_populates="admin"
    )
    granted_scopes: Mapped[list["AdminScope"]] = relationship(
        "AdminScope", foreign_keys="[AdminScope.granted_by_id]", back_populates="granted_by"
    )