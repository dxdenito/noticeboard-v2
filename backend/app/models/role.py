from app.core.database import Base
from sqlalchemy import Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.models.user import User


class Role(Base):
    __tablename__ = "roles"
    id: Mapped[int] = mapped_column(
        Integer, primary_key=True, autoincrement=True, index=True
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)

    users: Mapped[list["User"]] = relationship(back_populates="role")