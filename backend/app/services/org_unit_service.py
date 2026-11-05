from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, update, delete as sql_delete
from fastapi import HTTPException, UploadFile

from app.repositories.org_unit_repository import OrgUnitRepository
from app.services.audit_log_service import AuditLogService, snapshot, format_changes
from app.services.permission_service import PermissionService
from app.models.org_unit import OrgUnit
from app.models.user import User
from app.models.notice import Notice
from app.models.event import Event
from app.models.admin_scope import AdminScope
from app.schemas.org_unit_schema import (
    OrgUnitCreate, OrgUnitUpdate, OrgUnitRead, OrgUnitTreeNode, OrgUnitUsage,
)

from app.core.csv_utils import build_csv, read_csv_upload
from app.schemas.import_schema import ImportResult, ImportRowIssue
from collections import Counter

PATH_SEPARATOR = " > "


def _norm(value: str) -> str:
    return " ".join(value.split()).casefold()


ORG_UNIT_AUDIT_FIELDS = ("name", "type", "parent_id", "head_title", "head_name")

class OrgUnitService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.org_unit_repo = OrgUnitRepository(db)
        self.audit_log_service = AuditLogService(db)
        self.permission_service = PermissionService(db)

    def _check_write_permission(self, current_user: User) -> None:
        if not self.permission_service.has_right(current_user, "can_manage_org_units"):
            raise HTTPException(403, "You don't have permission to manage org units")

    async def create(self, data: OrgUnitCreate, current_user: User) -> OrgUnit:
        self._check_write_permission(current_user)

        if data.parent_id is not None:
            parent = await self.org_unit_repo.get_by_id(data.parent_id)
            if not parent:
                raise HTTPException(404, "Parent org unit not found")

        org_unit = OrgUnit(**data.model_dump())
        created = await self.org_unit_repo.add(org_unit)

        await self.audit_log_service.log(
            current_user, "org_unit.create", "org_unit", created.id, created.name,
        )
        return created

    async def update(self, org_unit_id: int, data: OrgUnitUpdate, current_user: User) -> OrgUnit:
        self._check_write_permission(current_user)

        org_unit = await self.org_unit_repo.get_by_id(org_unit_id)
        if not org_unit:
            raise HTTPException(404, "Org unit not found")

        if data.parent_id is not None and data.parent_id != org_unit.parent_id:
            if data.parent_id == org_unit.id:
                raise HTTPException(400, "An org unit cannot be its own parent")
            new_parent = await self.org_unit_repo.get_by_id(data.parent_id)
            if not new_parent:
                raise HTTPException(404, "Parent org unit not found")
            if await self._creates_cycle(org_unit.id, new_parent):
                raise HTTPException(400, "This change would create a circular org structure")
        before = snapshot(org_unit, ORG_UNIT_AUDIT_FIELDS)

        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(org_unit, field, value)

        await self.org_unit_repo.add(org_unit)

        await self.audit_log_service.log(
            current_user, "org_unit.update", "org_unit", org_unit.id, org_unit.name,
            details=format_changes(before, snapshot(org_unit, ORG_UNIT_AUDIT_FIELDS)),
        )
        return org_unit

    async def _creates_cycle(self, moving_id: int, new_parent: OrgUnit) -> bool:
        current: OrgUnit | None = new_parent
        while current is not None:
            if current.id == moving_id:
                return True
            if current.parent_id is None:
                break
            current = await self.org_unit_repo.get_by_id(current.parent_id)
        return False

    async def _count(self, statement) -> int:
        result = await self.db.execute(statement)
        return result.scalar_one()

    async def _usage(self, org_unit_id: int) -> OrgUnitUsage:
        return OrgUnitUsage(
            users=await self._count(
                select(func.count(User.id)).where(User.org_unit_id == org_unit_id)
            ),
            notices=await self._count(
                select(func.count(Notice.id)).where(Notice.org_unit_id == org_unit_id)
            ),
            events=await self._count(
                select(func.count(Event.id)).where(Event.org_unit_id == org_unit_id)
            ),
            scopes=await self._count(
                select(func.count(AdminScope.id)).where(
                    AdminScope.org_unit_id == org_unit_id, AdminScope.revoked_at.is_(None)
                )
            ),
            children=await self._count(
                select(func.count(OrgUnit.id)).where(OrgUnit.parent_id == org_unit_id)
            ),
        )

    async def get_usage(self, org_unit_id: int, current_user: User) -> OrgUnitUsage:
        self._check_write_permission(current_user)
        org_unit = await self.org_unit_repo.get_by_id(org_unit_id)
        if not org_unit:
            raise HTTPException(404, "Org unit not found")
        return await self._usage(org_unit_id)

    def _path_parts(self, unit: OrgUnit, by_id: dict[int, OrgUnit]) -> list[str]:
        parts = [unit.name]
        node = unit
        visited = {unit.id}
        while node.parent_id is not None and node.parent_id in by_id and node.parent_id not in visited:
            node = by_id[node.parent_id]
            visited.add(node.id)
            parts.append(node.name)
        parts.reverse()
        return parts

    async def export_csv(self, current_user: User) -> bytes:
        self._check_write_permission(current_user)
        units = await self.org_unit_repo.list_all()
        by_id = {unit.id: unit for unit in units}
        name_counts = Counter(_norm(unit.name) for unit in units)

        entries = [(self._path_parts(unit, by_id), unit) for unit in units]
        entries.sort(key=lambda entry: [part.casefold() for part in entry[0]])

        rows = []
        for parts, unit in entries:
            parent = by_id.get(unit.parent_id) if unit.parent_id is not None else None
            if parent is None:
                parent_text = ""
            elif name_counts[_norm(parent.name)] == 1:
                parent_text = parent.name
            else:
                parent_text = PATH_SEPARATOR.join(self._path_parts(parent, by_id))
            rows.append([unit.name, unit.type, parent_text, unit.head_title or "", unit.head_name or ""])

        content = build_csv(["name", "type", "parent_path", "head_title", "head_name"], rows)

        await self.audit_log_service.log(
            current_user, "org_unit.export", "org_unit", None, "CSV export", details=f"{len(units)} org units",
        )
        return content

    def _resolve_parent(
        self,
        parent_parts: list[str],
        path_map: dict[tuple[str, ...], int],
        name_index: dict[str, list[tuple[str, ...]]],
        display_map: dict[tuple[str, ...], str],
    ) -> tuple[tuple[str, ...], str | None]:
        if not parent_parts:
            return (), None

        wanted = tuple(_norm(part) for part in parent_parts)
        shown = PATH_SEPARATOR.join(parent_parts)

        if len(wanted) > 1:
            if wanted in path_map:
                return wanted, None
            return (), f'Parent "{shown}" was not found'

        matches = name_index.get(wanted[0], [])
        top_level = [key for key in matches if len(key) == 1]
        if top_level:
            return top_level[0], None
        if len(matches) == 1:
            return matches[0], None
        if not matches:
            return (), f'Parent "{shown}" was not found'

        options = "; ".join(display_map[key] for key in matches[:5])
        return (), f'Parent "{shown}" matches several units. Use the full path: {options}'

    async def import_csv(self, file: UploadFile, current_user: User, dry_run: bool) -> ImportResult:
        self._check_write_permission(current_user)
        rows = await read_csv_upload(file, ("name", "type"))

        units = await self.org_unit_repo.list_all()
        by_id = {unit.id: unit for unit in units}
        path_map: dict[tuple[str, ...], int] = {}
        name_index: dict[str, list[tuple[str, ...]]] = {}
        display_map: dict[tuple[str, ...], str] = {}
        for unit in units:
            parts = self._path_parts(unit, by_id)
            key = tuple(_norm(part) for part in parts)
            path_map[key] = unit.id
            name_index.setdefault(key[-1], []).append(key)
            display_map[key] = PATH_SEPARATOR.join(parts)

        errors: list[ImportRowIssue] = []
        skipped: list[ImportRowIssue] = []
        candidates: list[dict] = []

        for line, row in rows:
            name = " ".join(row.get("name", "").split())
            unit_type = " ".join(row.get("type", "").split())
            parent_parts = [
                " ".join(part.split()) for part in row.get("parent_path", "").split(">") if part.strip()
            ]
            head_title = " ".join(row.get("head_title", "").split()) or None
            head_name = " ".join(row.get("head_name", "").split()) or None

            problem = None
            if not name:
                problem = "Name is required"
            elif len(name) > 255:
                problem = "Name is longer than 255 characters"
            elif ">" in name:
                problem = 'Name cannot contain ">"'
            elif not unit_type:
                problem = "Type is required"
            elif len(unit_type) > 100:
                problem = "Type is longer than 100 characters"
            elif head_title and len(head_title) > 255:
                problem = "Head title is longer than 255 characters"
            elif head_name and len(head_name) > 255:
                problem = "Head name is longer than 255 characters"

            if problem:
                errors.append(ImportRowIssue(line=line, message=problem))
                continue

            candidates.append({
                "line": line, "name": name, "type": unit_type, "parent_parts": parent_parts,
                "head_title": head_title, "head_name": head_name,
            })

        plan: list[dict] = []
        placeholder = 0
        remaining = candidates

        while remaining:
            unresolved: list[dict] = []
            progressed = False

            for candidate in remaining:
                parent_key, problem = self._resolve_parent(
                    candidate["parent_parts"], path_map, name_index, display_map
                )
                if problem is not None:
                    candidate["problem"] = problem
                    unresolved.append(candidate)
                    continue

                progressed = True
                key = parent_key + (_norm(candidate["name"]),)
                parent_label = display_map[parent_key] if parent_key else ""
                label = f"{parent_label}{PATH_SEPARATOR}{candidate['name']}" if parent_label else candidate["name"]

                if key in path_map:
                    skipped.append(ImportRowIssue(
                        line=candidate["line"], message=f"{label} already exists (or is listed twice)",
                    ))
                    continue

                placeholder -= 1
                path_map[key] = placeholder
                name_index.setdefault(key[-1], []).append(key)
                display_map[key] = label
                plan.append({
                    **candidate,
                    "placeholder": placeholder,
                    "parent_id": path_map[parent_key] if parent_key else None,
                })

            if not progressed:
                for candidate in unresolved:
                    errors.append(ImportRowIssue(line=candidate["line"], message=candidate["problem"]))
                break

            remaining = unresolved

        errors.sort(key=lambda issue: issue.line)
        skipped.sort(key=lambda issue: issue.line)

        if errors:
            return ImportResult(
                dry_run=dry_run, created=0, skipped=len(skipped), errors=errors, skipped_rows=skipped,
            )

        if not dry_run and plan:
            real_ids: dict[int, int] = {}
            try:
                for entry in plan:
                    parent_id = entry["parent_id"]
                    if parent_id is not None and parent_id < 0:
                        parent_id = real_ids[parent_id]
                    unit = OrgUnit(
                        name=entry["name"], type=entry["type"], parent_id=parent_id,
                        head_title=entry["head_title"], head_name=entry["head_name"],
                    )
                    self.db.add(unit)
                    await self.db.flush()
                    real_ids[entry["placeholder"]] = unit.id
                await self.db.commit()
            except Exception:
                await self.db.rollback()
                raise HTTPException(500, "The import failed and nothing was saved")

            await self.audit_log_service.log(
                current_user, "org_unit.import", "org_unit", None, "CSV import",
                details=f"{len(plan)} added, {len(skipped)} skipped",
            )

        return ImportResult(
            dry_run=dry_run, created=len(plan), skipped=len(skipped), errors=[], skipped_rows=skipped,
        )

    async def delete(self, org_unit_id: int, current_user: User, reassign_to: int | None = None) -> None:
        self._check_write_permission(current_user)

        org_unit = await self.org_unit_repo.get_by_id(org_unit_id)
        if not org_unit:
            raise HTTPException(404, "Org unit not found")

        usage = await self._usage(org_unit_id)
        if usage.children:
            raise HTTPException(400, "Cannot delete an org unit that still has children")

        needs_reassign = usage.users + usage.notices + usage.events + usage.scopes > 0
        target: OrgUnit | None = None

        if needs_reassign:
            if reassign_to is None:
                raise HTTPException(
                    409,
                    "This org unit still has users, notices, events or scope grants. "
                    "Choose another org unit to move them to.",
                )
            if reassign_to == org_unit_id:
                raise HTTPException(400, "Choose a different org unit to move records to")
            target = await self.org_unit_repo.get_by_id(reassign_to)
            if not target:
                raise HTTPException(404, "Replacement org unit not found")

        name = org_unit.name

        if target is not None:
            await self.db.execute(
                update(User).where(User.org_unit_id == org_unit_id).values(org_unit_id=target.id)
            )
            await self.db.execute(
                update(Notice).where(Notice.org_unit_id == org_unit_id).values(org_unit_id=target.id)
            )
            await self.db.execute(
                update(Event).where(Event.org_unit_id == org_unit_id).values(org_unit_id=target.id)
            )

            existing_result = await self.db.execute(
                select(AdminScope.admin_id, AdminScope.scope_type).where(
                    AdminScope.org_unit_id == target.id, AdminScope.revoked_at.is_(None)
                )
            )
            existing_pairs = {(admin_id, scope_type) for admin_id, scope_type in existing_result.all()}

            active_result = await self.db.execute(
                select(AdminScope).where(
                    AdminScope.org_unit_id == org_unit_id, AdminScope.revoked_at.is_(None)
                )
            )
            for scope in active_result.scalars().all():
                if (scope.admin_id, scope.scope_type) in existing_pairs:
                    await self.db.delete(scope)
                else:
                    scope.org_unit_id = target.id

        await self.db.execute(
            sql_delete(AdminScope).where(
                AdminScope.org_unit_id == org_unit_id, AdminScope.revoked_at.is_not(None)
            )
        )

        await self.org_unit_repo.delete(org_unit)

        details = None
        if target is not None:
            details = (
                f"moved to {target.name}: {usage.users} users, {usage.notices} notices, "
                f"{usage.events} events, {usage.scopes} scope grants"
            )
        await self.audit_log_service.log(
            current_user, "org_unit.delete", "org_unit", org_unit_id, name, details=details,
        )

    async def get_by_id(self, org_unit_id: int) -> OrgUnit:
        org_unit = await self.org_unit_repo.get_by_id(org_unit_id)
        if not org_unit:
            raise HTTPException(404, "Org unit not found")
        return org_unit

    async def list_all(self, type_filter: str | None = None) -> list[OrgUnit]:
        return await self.org_unit_repo.list_all(type_filter)

    async def list_types(self) -> list[str]:
        return await self.org_unit_repo.list_distinct_types()

    async def get_tree(self) -> list[OrgUnitTreeNode]:
        all_units = await self.org_unit_repo.list_all()
        by_parent: dict[int | None, list[OrgUnit]] = {}
        for unit in all_units:
            by_parent.setdefault(unit.parent_id, []).append(unit)

        def build(unit: OrgUnit) -> OrgUnitTreeNode:
            base = OrgUnitRead.model_validate(unit)
            return OrgUnitTreeNode(
                **base.model_dump(),
                children=[build(child) for child in by_parent.get(unit.id, [])],
            )

        return [build(root) for root in by_parent.get(None, [])]