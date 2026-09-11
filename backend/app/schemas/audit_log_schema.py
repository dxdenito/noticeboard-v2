from pydantic import BaseModel
from datetime import datetime


class AuditLogRead(BaseModel):
    id: int
    actor_id: int | None
    action: str
    target_type: str
    target_id: int | None
    target_label: str | None
    details: str | None
    created_at: datetime

    class Config:
        from_attributes = True