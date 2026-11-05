import re
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, UploadFile
from sqlalchemy.exc import IntegrityError

from app.repositories.institutional_domain_repository import InstitutionalDomainRepository
from app.services.audit_log_service import AuditLogService
from app.models.institutional_domain import InstitutionalDomain
from app.models.notice import Audience
from app.models.user import User
from app.schemas.institutional_domain_schema import InstitutionalDomainCreate
from app.schemas.import_schema import ImportResult, ImportRowIssue
from app.core.csv_utils import build_csv, read_csv_upload

DOMAIN_PATTERN = re.compile(r"^(?=.{1,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$")
PUBLIC_EMAIL_DOMAINS = {
    "gmail.com", "googlemail.com", "yahoo.com", "ymail.com", "outlook.com", "hotmail.com",
    "live.com", "msn.com", "icloud.com", "me.com", "aol.com", "proton.me", "protonmail.com",
}
IMPORT_AUDIENCES = ("student", "staff")


class InstitutionalDomainService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.domain_repo = InstitutionalDomainRepository(db)
        self.audit_log_service = AuditLogService(db)

    def _check_manage_permission(self, current_user: User) -> None:
        if current_user.role.name != "super_admin":
            raise HTTPException(403, "Only a super_admin can manage institutional domains")

    def _domain_problem(self, domain_value: str) -> str | None:
        if not DOMAIN_PATTERN.match(domain_value):
            return f'"{domain_value}" is not a valid domain (example: students.example.ac.ke)'
        if domain_value in PUBLIC_EMAIL_DOMAINS:
            return f'"{domain_value}" is a public email provider and cannot be used as an institutional domain'
        return None

    async def create(self, data: InstitutionalDomainCreate, current_user: User) -> InstitutionalDomain:
        self._check_manage_permission(current_user)
        domain_value = data.domain.strip().lower().lstrip("@")

        problem = self._domain_problem(domain_value)
        if problem:
            raise HTTPException(400, problem)
        if data.audience == Audience.PUBLIC:
            raise HTTPException(400, "Choose student or staff as the audience")

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

    async def export_csv(self, current_user: User) -> bytes:
        self._check_manage_permission(current_user)
        items = await self.domain_repo.list_all()
        content = build_csv(
            ["domain", "audience", "label"],
            [[item.domain, item.audience.value, item.label or ""] for item in items],
        )
        await self.audit_log_service.log(
            current_user, "institutional_domain.export", "institutional_domain", None,
            "CSV export", details=f"{len(items)} domains",
        )
        return content

    async def import_csv(self, file: UploadFile, current_user: User, dry_run: bool) -> ImportResult:
        self._check_manage_permission(current_user)
        rows = await read_csv_upload(file, ("domain", "audience"))

        existing = {item.domain for item in await self.domain_repo.list_all()}
        seen: set[str] = set()
        errors: list[ImportRowIssue] = []
        skipped: list[ImportRowIssue] = []
        pending: list[InstitutionalDomain] = []

        for line, row in rows:
            domain_value = row.get("domain", "").strip().lower().lstrip("@")
            audience_text = row.get("audience", "").strip().lower()
            label = row.get("label", "").strip() or None

            problem = self._domain_problem(domain_value)
            if problem:
                errors.append(ImportRowIssue(line=line, message=problem))
                continue
            if audience_text not in IMPORT_AUDIENCES:
                errors.append(ImportRowIssue(
                    line=line, message=f'Audience must be "student" or "staff" (got "{audience_text}")',
                ))
                continue
            if label and len(label) > 255:
                errors.append(ImportRowIssue(line=line, message="Label is longer than 255 characters"))
                continue
            if domain_value in existing:
                skipped.append(ImportRowIssue(line=line, message=f"{domain_value} already exists"))
                continue
            if domain_value in seen:
                skipped.append(ImportRowIssue(line=line, message=f"{domain_value} is listed more than once"))
                continue

            seen.add(domain_value)
            pending.append(InstitutionalDomain(
                domain=domain_value, audience=Audience(audience_text), label=label,
            ))

        if errors:
            errors.sort(key=lambda issue: issue.line)
            return ImportResult(
                dry_run=dry_run, created=0, skipped=len(skipped), errors=errors, skipped_rows=skipped,
            )

        if not dry_run and pending:
            self.db.add_all(pending)
            try:
                await self.db.commit()
            except IntegrityError:
                await self.db.rollback()
                raise HTTPException(409, "A domain was added by someone else during the import. Try again.")
            await self.audit_log_service.log(
                current_user, "institutional_domain.import", "institutional_domain", None,
                "CSV import", details=f"{len(pending)} added, {len(skipped)} skipped",
            )

        return ImportResult(
            dry_run=dry_run, created=len(pending), skipped=len(skipped), errors=[], skipped_rows=skipped,
        )