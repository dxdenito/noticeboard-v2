from pydantic import BaseModel
from app.models.notice import Audience


class InstitutionalDomainCreate(BaseModel):
    domain: str
    audience: Audience
    label: str | None = None


class InstitutionalDomainRead(BaseModel):
    id: int
    domain: str
    audience: Audience
    label: str | None

    class Config:
        from_attributes = True