from datetime import datetime
from sqlalchemy import DateTime, func, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base

from typing import TYPE_CHECKING
if TYPE_CHECKING:
    from app.models.user import User
    from app.models.department import Department
    from app.models.club import Club


class AdminDepartmentScope(Base):
    __tablename__ = "admin_department_scopes"

    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), primary_key=True)
    department_id: Mapped[int] = mapped_column(ForeignKey("departments.id"), primary_key=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user: Mapped["User"] = relationship(back_populates="department_scopes")
    department: Mapped["Department"] = relationship()


class AdminClubScope(Base):
    __tablename__ = "admin_club_scopes"

    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), primary_key=True)
    club_id: Mapped[int] = mapped_column(ForeignKey("clubs.id"), primary_key=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user: Mapped["User"] = relationship(back_populates="club_scopes")
    club: Mapped["Club"] = relationship()