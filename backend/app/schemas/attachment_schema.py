from pydantic import BaseModel
from datetime import datetime

class AttachmentRead(BaseModel):
    id: int
    notice_id: int
    file_name: str
    file_url: str
    file_size: int | None
    content_type: str | None
    created_at: datetime

    class Config:
        from_attributes = True