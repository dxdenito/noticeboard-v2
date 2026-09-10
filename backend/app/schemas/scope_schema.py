from pydantic import BaseModel
from datetime import datetime
from app.models.admin_scope import ScopeType


class ScopeSummary(BaseModel):
    post_org_unit_ids: list[int]
    approve_org_unit_ids: list[int]


class ScopeRead(BaseModel):
    id: int
    admin_id: int
    org_unit_id: int
    scope_type: ScopeType
    granted_by_id: int
    granted_at: datetime
    revoked_at: datetime | None

    class Config:
        from_attributes = True