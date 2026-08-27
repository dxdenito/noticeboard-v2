# app/schemas/department_schema.py
from pydantic import BaseModel

class DepartmentCreate(BaseModel):
    name: str
    code: str

class DepartmentRead(BaseModel):
    id: int
    name: str
    code: str

    class Config:
        from_attributes = True