from pydantic import BaseModel, EmailStr
from app.schemas.role_schema import RoleRead


class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str


class UserRead(BaseModel):
    id: int
    email: EmailStr
    full_name: str
    role: RoleRead
    is_active: bool

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserRoleUpdate(BaseModel):
    role_id: int

class UserCreateByAdmin(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    role_id: int
    requires_approval: bool | None = None

class UserUpdate(BaseModel):
    full_name: str | None = None
    role_id: int | None = None
    requires_approval: bool | None = None
    is_active: bool | None = None


