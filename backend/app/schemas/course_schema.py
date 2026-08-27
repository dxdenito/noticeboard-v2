# app/schemas/course_schema.py
from pydantic import BaseModel

class CourseCreate(BaseModel):
    name: str
    code: str
    department_id: int

class CourseRead(BaseModel):
    id: int
    name: str
    code: str
    department_id: int

    class Config:
        from_attributes = True