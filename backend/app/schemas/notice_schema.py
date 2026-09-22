from pydantic import BaseModel, Field

from datetime import datetime

from app.models.notice import Audience, NoticeStatus
from app.schemas.attachment_schema import AttachmentRead
from app.schemas.category_schema import CategoryRead


class NoticeAuthorRead(BaseModel):
    id: int
    full_name: str

    class Config:
        from_attributes = True


class NoticeOrgUnitRead(BaseModel):
    id: int
    name: str
    type: str

    class Config:
        from_attributes = True


class NoticeCreate(BaseModel):
    title: str
    body: str
    category_id: int
    audience: Audience
    org_unit_id: int
    expiry_date: datetime | None = None

class NoticeRead(BaseModel):
    id: int
    title: str
    body: str | None
    category: CategoryRead
    author_id: int
    author: NoticeAuthorRead
    audience: Audience
    org_unit_id: int
    org_unit: NoticeOrgUnitRead
    expiry_date: datetime | None
    created_at: datetime
    is_pinned_feed: bool = False  
    status: NoticeStatus
    rejection_notes: str | None = None
    reviewed_by: NoticeAuthorRead | None = None
    reviewed_at: datetime | None = None
    is_pinned_site: bool = False
    is_locked: bool = False
    attachments: list[AttachmentRead] = []

    class Config:
        from_attributes = True

class NoticeUpdate(BaseModel):
    title: str | None = None
    body: str | None = None
    category_id: int | None = None
    audience: Audience | None = None
    org_unit_id: int | None = None
    expiry_date: datetime | None = None

class NoticeReject(BaseModel):
    rejection_notes: str = Field(..., min_length=1)