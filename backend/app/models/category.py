from app.core.database import Base
from sqlalchemy import Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.models.notice import Notice

class Category(Base):
    __tablename__ = "categories"
    id: Mapped[int] = mapped_column(
        Integer, primary_key=True, autoincrement=True, index=True
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)

    notices: Mapped[list["Notice"]] = relationship(back_populates="category")