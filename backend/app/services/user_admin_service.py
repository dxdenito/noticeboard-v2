from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status

from app.core.config import settings
from app.repositories.user_repository import UserRepository
from app.repositories.role_repository import RoleRepository
from app.models.user import User
from app.schemas.user_schema import UserCreateByAdmin, UserUpdate
from app.core.security import hash_password

TRUSTED_ROLE_NAMES = ("super_admin",)
CAPABILITY_FIELDS = (
    "can_approve", "can_post", "can_manage_users",
    "can_manage_tags", "can_manage_org_units", "can_pin",
    "can_assign_post_scope", "can_assign_approve_scope",
)


class UserAdminService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.user_repo = UserRepository(db)
        self.role_repo = RoleRepository(db)

    def _has_manage_users_right(self, current_user: User) -> bool:
        if current_user.role.name == "super_admin":
            return True
        if current_user.role.name in ("ict_sub_admin", "corporate_admin"):
            return bool(current_user.can_manage_users)
        return False

    async def create_user(self, data: UserCreateByAdmin, current_user: User) -> User:
        if not self._has_manage_users_right(current_user):
            raise HTTPException(403, "You don't have permission to create users")

        is_delegate = current_user.role.name != "super_admin"

        if is_delegate:
            target_role = await self.role_repo.get_by_id(data.role_id)
            if target_role is None:
                raise HTTPException(404, "Role not found")
            if target_role.name in TRUSTED_ROLE_NAMES:
                raise HTTPException(403, "Only super_admin can create super_admin accounts")
            for field in CAPABILITY_FIELDS:
                if getattr(data, field) not in (None, False):
                    raise HTTPException(403, "Only super_admin can set capability flags on a new account")

        existing = await self.user_repo.get_by_email(data.email)
        if existing:
            raise HTTPException(400, "Email already registered")

        new_user = User(
            email=data.email,
            hashed_password=hash_password(data.password),
            full_name=data.full_name,
            role_id=data.role_id,
            requires_approval=data.requires_approval,
            can_approve=data.can_approve,
            can_post=data.can_post,
            can_manage_users=data.can_manage_users,
            can_manage_tags=data.can_manage_tags,
            can_manage_org_units=data.can_manage_org_units,
            can_pin=data.can_pin,
            can_assign_post_scope=data.can_assign_post_scope,
            can_assign_approve_scope=data.can_assign_approve_scope,
            is_active=True,
        )
        await self.user_repo.create_user(new_user)

        reloaded = await self.user_repo.get_by_email(data.email)
        if reloaded is None:
            raise HTTPException(500, "User creation failed unexpectedly")
        return reloaded

    async def update_user(self, user_id: int, data: UserUpdate, current_user: User) -> User:
        if not self._has_manage_users_right(current_user):
            raise HTTPException(403, "You don't have permission to manage users")

        user = await self.user_repo.get_by_id(user_id)
        if not user:
            raise HTTPException(404, "User not found")

        if user.id == current_user.id and data.is_active is False:
            raise HTTPException(400, "You cannot deactivate your own account")

        is_delegate = current_user.role.name != "super_admin"
        is_self_edit = is_delegate and user.id == current_user.id
        payload = data.model_dump(exclude_unset=True)

        if is_self_edit:
            if "role_id" in payload or any(field in payload for field in CAPABILITY_FIELDS):
                raise HTTPException(403, "You cannot change your own role or rights")

        if is_delegate and not is_self_edit:
            if "role_id" in payload:
                target_role = await self.role_repo.get_by_id(payload["role_id"])
                if target_role is not None and target_role.name in TRUSTED_ROLE_NAMES:
                    raise HTTPException(403, "Only super_admin can assign super_admin")
            for field in CAPABILITY_FIELDS:
                if field in payload:
                    raise HTTPException(403, "Only super_admin can change capability flags")

        for field, value in payload.items():
            setattr(user, field, value)

        updated = await self.user_repo.update(user)
        reloaded = await self.user_repo.get_by_id(updated.id)
        if reloaded is None:
            raise HTTPException(500, "User update failed unexpectedly")
        return reloaded

    async def list_users(self, current_user: User, limit: int, offset: int, search: str | None = None) -> list[User]:
        if current_user.role.name == "corporate_super_admin":
            return await self.user_repo.list_by_role_name("corporate_admin", limit, offset, search)

        if not self._has_manage_users_right(current_user):
            raise HTTPException(403, "You don't have permission to view users")

        return await self.user_repo.list_users(limit, offset, search)