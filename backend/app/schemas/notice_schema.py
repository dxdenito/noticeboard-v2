from pydantic import BaseModel

from datetime import datetime

from app.models.notice import Audience, NoticeStatus
from app.schemas.attachment_schema import AttachmentRead

class NoticeCreate(BaseModel):
    title: str
    body: str
    category_id: int
    audience:Audience
    department_id: int | None = None
    club_id: int | None = None
    course_id: int | None = None
    expiry_date: datetime | None = None

class NoticeRead(BaseModel):
    id: int
    title: str
    body: str | None
    category_id: int
    author_id: int
    audience: Audience
    department_id: int | None 
    club_id: int | None 
    course_id: int | None 
    expiry_date: datetime | None
    created_at: datetime
    is_pinned_feed: bool = False  
    status: NoticeStatus
    is_pinned_site: bool = False
    is_locked: bool = False
    attachments: list[AttachmentRead] = []

    class Config:
        from_attributes = True