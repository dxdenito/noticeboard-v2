from app.core.database import Base
from sqlalchemy import Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship


class Category(Base):
    __tablename__ = "categories"
    id: Mapped[int] = mapped_column(
        Integer, primary_key=True, autoincrement=True, index=True
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)
