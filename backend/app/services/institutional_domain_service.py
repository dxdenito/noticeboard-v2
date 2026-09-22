from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException
from sqlalchemy.exc import IntegrityError

from app.repositories.institutional_domain_repository import InstitutionalDomainRepository
from app.services.audit_log_service import AuditLogService
from app.models.institutional_domain import InstitutionalDomain
from app.models.notice import Audience
from app.models.user import User
from app.schemas.institutional_domain_schema import InstitutionalDomainCreate


class InstitutionalDomainService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.domain_repo = InstitutionalDomainRepository(db)
        self.audit_log_service = AuditLogService(db)

    def _check_manage_permission(self, current_user: User) -> None:
        if current_user.role.name != "super_admin":
            raise HTTPException(403, "Only a super_admin can manage institutional domains")

    async def create(self, data: InstitutionalDomainCreate, current_user: User) -> InstitutionalDomain:
        self._check_manage_permission(current_user)
        domain_value = data.domain.strip().lower()
        new_item = InstitutionalDomain(
            domain=domain_value, audience=data.audience, label=data.label
        )
        try:
            created = await self.domain_repo.create(new_item)
        except IntegrityError:
            raise HTTPException(400, "This domain is already registered")

        await self.audit_log_service.log(
            current_user, "institutional_domain.create", "institutional_domain",
            created.id, created.domain, details=f"audience: {created.audience.value}",
        )
        return created

    async def list_all(self) -> list[InstitutionalDomain]:
        return await self.domain_repo.list_all()

    async def resolve_audience(self, email: str) -> Audience | None:
        email = email.strip().lower()
        if "@" not in email:
            return None
        domain = email.rsplit("@", 1)[1]
        item = await self.domain_repo.get_by_domain(domain)
        return item.audience if item else None

    async def delete(self, id: int, current_user: User) -> None:
        self._check_manage_permission(current_user)
        item = await self.domain_repo.get_by_id(id)
        if not item:
            raise HTTPException(404, "Domain not found")

        domain_value = item.domain
        await self.domain_repo.delete(item)

        await self.audit_log_service.log(
            current_user, "institutional_domain.delete", "institutional_domain", id, domain_value,
        )