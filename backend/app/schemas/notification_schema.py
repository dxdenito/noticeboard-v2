from pydantic import BaseModel
from datetime import datetime


class NotificationRead(BaseModel):
    id: int
    type: str
    title: str
    message: str
    notice_id: int | None = None
    event_id: int | None = None
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True