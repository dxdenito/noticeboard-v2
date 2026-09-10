from pydantic import BaseModel
from datetime import datetime


class OrgUnitCreate(BaseModel):
    name: str
    type: str
    parent_id: int | None = None
    head_title: str | None = None
    head_name: str | None = None


class OrgUnitUpdate(BaseModel):
    name: str | None = None
    type: str | None = None
    parent_id: int | None = None
    head_title: str | None = None
    head_name: str | None = None


class OrgUnitRead(BaseModel):
    id: int
    name: str
    type: str
    parent_id: int | None
    head_title: str | None
    head_name: str | None
    created_at: datetime

    class Config:
        from_attributes = True


class OrgUnitTreeNode(OrgUnitRead):
    children: list["OrgUnitTreeNode"] = []