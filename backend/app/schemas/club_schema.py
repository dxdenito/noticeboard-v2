# app/schemas/club_schema.py
from pydantic import BaseModel

class ClubCreate(BaseModel):
    name: str
    description: str | None = None

class ClubRead(BaseModel):
    id: int
    name: str
    description: str | None

    class Config:
        from_attributes = True