from pydantic import BaseModel, EmailStr
from app.schemas.role_schema import RoleRead


class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str

class UserOrgUnitRead(BaseModel):
    id: int
    name: str

    class Config:
        from_attributes = True


class UserRead(BaseModel):
    id: int
    email: EmailStr
    full_name: str
    pf_number: str
    org_unit_id: int
    org_unit: UserOrgUnitRead
    role: RoleRead
    is_active: bool
    must_change_password: bool
    can_approve: bool | None
    can_post: bool | None
    can_manage_users: bool | None
    can_manage_tags: bool | None
    can_manage_org_units: bool | None
    can_pin: bool | None
    can_assign_post_scope: bool | None
    can_assign_approve_scope: bool | None
    can_delete_notice: bool | None

    class Config:
        from_attributes = True


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserRoleUpdate(BaseModel):
    role_id: int

class UserCreateByAdmin(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    pf_number: str
    org_unit_id: int
    role_id: int
    requires_approval: bool | None = None
    can_approve: bool | None = None
    can_post: bool | None = None
    can_manage_users: bool | None = None
    can_manage_tags: bool | None = None
    can_manage_org_units: bool | None = None
    can_pin: bool | None = None
    can_assign_post_scope: bool | None = None
    can_assign_approve_scope: bool | None = None
    can_delete_notice: bool | None = None

class UserUpdate(BaseModel):
    full_name: str | None = None
    pf_number: str | None = None
    org_unit_id: int | None = None
    role_id: int | None = None
    requires_approval: bool | None = None
    can_approve: bool | None = None
    can_post: bool | None = None
    can_manage_users: bool | None = None
    can_manage_tags: bool | None = None
    can_manage_org_units: bool | None = None
    can_pin: bool | None = None
    can_assign_post_scope: bool | None = None
    can_assign_approve_scope: bool | None = None
    can_delete_notice: bool | None = None
    is_active: bool | None = None