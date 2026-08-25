from datetime import datetime
from app.core.database import Base
from sqlalchemy import Integer, String, ForeignKey, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.models.department import Department
    from app.models.notice import Notice

class Course(Base):
    __tablename__ = "courses"
    id: Mapped[int] = mapped_column(
        Integer, primary_key=True, autoincrement=True, index=True
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)
    code: Mapped[str] = mapped_column(String(255), nullable=False, unique = True)
    department_id: Mapped[int] = mapped_column(Integer,ForeignKey("departments.id"), nullable= False )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
    department: Mapped["Department"] = relationship(
        "Department", back_populates="courses"
    )
    notices: Mapped[list["Notice"]] = relationship(back_populates="course")

