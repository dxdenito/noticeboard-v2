from pydantic import BaseModel
from datetime import datetime


class AuditLogActorRead(BaseModel):
    id: int
    full_name: str

    class Config:
        from_attributes = True


class AuditLogRead(BaseModel):
    id: int
    actor: AuditLogActorRead | None
    action: str
    target_type: str
    target_id: int | None
    target_label: str | None
    details: str | None
    created_at: datetime

    class Config:
        from_attributes = True