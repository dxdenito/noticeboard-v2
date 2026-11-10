from datetime import date
from typing import Literal

from pydantic import BaseModel, EmailStr, Field, field_validator


def _single_line(value: str | None) -> str | None:
    if value is None:
        return None
    cleaned = " ".join(value.replace("\r", " ").replace("\n", " ").split())
    return cleaned or None


class DigestSettingsRead(BaseModel):
    auto_enabled: bool
    send_day: int
    send_hour: int
    max_notices: int
    excerpt_length: int
    include_events: bool
    paused_until: date | None
    student_list_email: str | None
    staff_list_email: str | None

    class Config:
        from_attributes = True


class DigestSettingsUpdate(BaseModel):
    auto_enabled: bool
    send_day: int = Field(ge=0, le=6)
    send_hour: int = Field(ge=0, le=23)
    max_notices: int = Field(ge=1, le=10)
    excerpt_length: int = Field(ge=60, le=400)
    include_events: bool
    paused_until: date | None = None
    student_list_email: EmailStr | None = None
    staff_list_email: EmailStr | None = None

    @field_validator("student_list_email", "staff_list_email", mode="before")
    @classmethod
    def blank_to_none(cls, value):
        if value is None:
            return None
        if isinstance(value, str):
            value = value.strip()
            return value or None
        return value


class DigestSendRequest(BaseModel):
    kind: Literal["digest", "urgent"]
    notice_ids: list[int] = Field(default_factory=list, max_length=10)
    subject: str | None = Field(default=None, max_length=200)
    intro: str | None = Field(default=None, max_length=1000)
    scope: Literal["all", "student", "staff"] = "all"

    @field_validator("subject")
    @classmethod
    def clean_subject(cls, value):
        return _single_line(value)

    @field_validator("intro")
    @classmethod
    def clean_intro(cls, value):
        if value is None:
            return None
        cleaned = value.replace("\r", "").strip()
        return cleaned or None


class DigestTestRequest(DigestSendRequest):
    audience: Literal["student", "staff"] = "staff"