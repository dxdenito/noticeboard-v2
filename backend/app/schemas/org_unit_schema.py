from pydantic import BaseModel, field_validator
from datetime import datetime


def _normalize_type(value: str) -> str:
    return " ".join(value.split())


class OrgUnitCreate(BaseModel):
    name: str
    type: str
    parent_id: int | None = None
    head_title: str | None = None
    head_name: str | None = None

    @field_validator("type")
    @classmethod
    def normalize_type(cls, v: str) -> str:
        return _normalize_type(v)


class OrgUnitUpdate(BaseModel):
    name: str | None = None
    type: str | None = None
    parent_id: int | None = None
    head_title: str | None = None
    head_name: str | None = None

    @field_validator("type")
    @classmethod
    def normalize_type(cls, v: str | None) -> str | None:
        return _normalize_type(v) if v is not None else v


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