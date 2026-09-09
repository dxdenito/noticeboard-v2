from datetime import datetime
from sqlalchemy import Integer, String, DateTime, func, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base

from typing import TYPE_CHECKING
if TYPE_CHECKING:
    from app.models.notice import Notice


class OrgUnit(Base):
    __tablename__ = "org_units"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    type: Mapped[str] = mapped_column(String(100), nullable=False)
    parent_id: Mapped[int | None] = mapped_column(ForeignKey("org_units.id"), nullable=True)
    head_title: Mapped[str | None] = mapped_column(String(255), nullable=True)
    head_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    parent: Mapped["OrgUnit"] = relationship("OrgUnit", remote_side=[id], back_populates="children")
    children: Mapped[list["OrgUnit"]] = relationship("OrgUnit", back_populates="parent")
    notices: Mapped[list["Notice"]] = relationship("Notice", back_populates="org_unit")

    def ancestors(self):
        node = self.parent
        while node is not None:
            yield node
            node = node.parent