from pydantic import BaseModel, Field, field_validator
from datetime import datetime

from app.models.notice import Audience, NoticeStatus



class EventAuthorRead(BaseModel):
    id: int
    full_name: str

    class Config:
        from_attributes = True


class EventOrgUnitRead(BaseModel):
    id: int
    name: str
    type: str

    class Config:
        from_attributes = True


class EventCreate(BaseModel):
    title: str
    description: str
    start_date: datetime
    end_date: datetime | None = None
    location: str | None = None
    audience: Audience
    org_unit_id: int


class EventUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    start_date: datetime | None = None
    end_date: datetime | None = None
    location: str | None = None
    audience: Audience | None = None
    org_unit_id: int | None = None


class EventRead(BaseModel):
    id: int
    title: str
    description: str
    start_date: datetime
    end_date: datetime | None
    location: str | None
    audience: Audience
    image_url: str | None
    org_unit_id: int
    org_unit: EventOrgUnitRead
    author_id: int
    author: EventAuthorRead
    status: NoticeStatus
    rejection_notes: str | None
    reviewed_by: EventAuthorRead | None
    reviewed_at: datetime | None
    created_at: datetime

    @field_validator("image_url", mode="before")
    @classmethod
    def build_image_url(cls, value, info):
        if not value:
            return None
        event_id = info.data.get("id")
        return f"/events/{event_id}/image"

    class Config:
        from_attributes = True


class EventReject(BaseModel):
    rejection_notes: str = Field(..., min_length=1)