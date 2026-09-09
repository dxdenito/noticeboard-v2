from pydantic import BaseModel
from datetime import datetime
from app.models.scope_audit_log import ScopeType, ScopeAction


class ScopeSummary(BaseModel):
    department_ids: list[int]
    club_ids: list[int]


class ScopeAuditLogRead(BaseModel):
    id: int
    scope_type: ScopeType
    scope_id: int
    scope_name: str
    action: ScopeAction
    performed_by_id: int
    created_at: datetime

    class Config:
        from_attributes = True