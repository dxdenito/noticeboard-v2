from app.core.database import Base
from sqlalchemy import Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.models.notice import Audience


class InstitutionalDomain(Base):
    __tablename__ = "institutional_domains"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True, index=True)
    domain: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)
    audience: Mapped[Audience] = mapped_column(nullable=False)
    label: Mapped[str | None] = mapped_column(String(255), nullable=True)