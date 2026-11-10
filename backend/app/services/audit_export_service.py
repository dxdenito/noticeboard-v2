from io import BytesIO
from datetime import datetime, timedelta, timezone

from openpyxl import Workbook
from openpyxl.cell.cell import ILLEGAL_CHARACTERS_RE
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter
from sqlalchemy.ext.asyncio import AsyncSession

from app.repositories.audit_log_repository import AuditLogRepository
from app.repositories.user_repository import UserRepository
from app.models.user import User

EAT = timezone(timedelta(hours=3))
EXPORT_MAX_ROWS = 20000
COLUMNS = [
    ("Date and time", 20),
    ("User", 26),
    ("Action", 28),
    ("Item type", 16),
    ("Item", 38),
    ("Item ID", 10),
    ("IP address", 40),
    ("Details", 80),
]
WRAP_COLUMNS = (5, 8)
HEADER_FILL = PatternFill("solid", start_color="1B5E20")
HEADER_FONT = Font(bold=True, color="FFFFFF")
LABEL_FONT = Font(bold=True, color="444444")
THIN = Side(style="thin", color="DDDDDD")
CELL_BORDER = Border(left=THIN, right=THIN, top=THIN, bottom=THIN)


def _fmt(value: datetime) -> str:
    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)
    return value.astimezone(EAT).strftime("%Y-%m-%d %H:%M")


def _put(ws, row: int, column: int, value):
    if isinstance(value, str):
        value = ILLEGAL_CHARACTERS_RE.sub("", value)
    cell = ws.cell(row=row, column=column, value=value)
    if isinstance(value, str) and cell.data_type == "f":
        cell.data_type = "s"
    return cell


class AuditExportService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.log_repo = AuditLogRepository(db)
        self.user_repo = UserRepository(db)

    async def build(
        self,
        exported_by: User,
        actor_id: int | None,
        target_type: str | None,
        action: str | None,
        search: str | None,
        date_from: datetime | None,
        date_to: datetime | None,
        ip_address: str | None = None,
    ) -> dict:
        rows = await self.log_repo.list_logs(
            actor_id, target_type, action, search, date_from, date_to,
            EXPORT_MAX_ROWS + 1, 0, ip_address,
        )
        truncated = len(rows) > EXPORT_MAX_ROWS
        rows = rows[:EXPORT_MAX_ROWS]

        actor_name = None
        if actor_id is not None:
            actor = await self.user_repo.get_by_id(actor_id)
            actor_name = actor.full_name if actor else f"user #{actor_id}"

        filter_rows = [
            ("User", actor_name or "Everyone"),
            ("Item type", target_type or "All types"),
            ("Action", action or "All actions"),
            ("IP address", ip_address or "Any address"),
            ("From", _fmt(date_from) if date_from else "Any date"),
            ("To", _fmt(date_to - timedelta(seconds=1)) if date_to else "Any date"),
            ("Search text", search or "None"),
        ]

        wb = Workbook()
        ws = wb.active
        ws.title = "Audit log"

        ws.cell(row=1, column=1, value="JKUAT Noticeboard - Audit Log").font = Font(bold=True, size=14)
        _put(
            ws, 2, 1,
            f"Exported by {exported_by.full_name} on {datetime.now(EAT).strftime('%Y-%m-%d %H:%M')}",
        )
        ws.cell(row=3, column=1, value="All times are East Africa Time (UTC+3)")

        ws.cell(row=5, column=1, value="Filters applied").font = LABEL_FONT
        current = 6
        for label, value in filter_rows:
            ws.cell(row=current, column=1, value=label).font = LABEL_FONT
            _put(ws, current, 2, value)
            current += 1

        ws.cell(row=current, column=1, value="Rows exported").font = LABEL_FONT
        count_text = str(len(rows))
        if truncated:
            count_text += f" (limited to the newest {EXPORT_MAX_ROWS}; narrow the filters to see the rest)"
        ws.cell(row=current, column=2, value=count_text)

        header_row = current + 2
        for index, (title, width) in enumerate(COLUMNS, start=1):
            cell = ws.cell(row=header_row, column=index, value=title)
            cell.font = HEADER_FONT
            cell.fill = HEADER_FILL
            cell.alignment = Alignment(vertical="center")
            cell.border = CELL_BORDER
            ws.column_dimensions[get_column_letter(index)].width = width

        row_number = header_row + 1
        for log in rows:
            created = log.created_at
            if created.tzinfo is None:
                created = created.replace(tzinfo=timezone.utc)
            created = created.astimezone(EAT).replace(tzinfo=None)

            details = (log.details or "").replace("; ", "\n")
            values = [
                created,
                log.actor.full_name if log.actor else "System / not signed in",
                log.action,
                log.target_type,
                log.target_label or "",
                log.target_id,
                log.ip_address or "",
                details,
            ]
            for index, value in enumerate(values, start=1):
                cell = _put(ws, row_number, index, value)
                cell.border = CELL_BORDER
                cell.alignment = Alignment(vertical="top", wrap_text=index in WRAP_COLUMNS)
                if index == 1:
                    cell.number_format = "yyyy-mm-dd hh:mm:ss"
            row_number += 1

        ws.freeze_panes = f"A{header_row + 1}"
        ws.auto_filter.ref = f"A{header_row}:{get_column_letter(len(COLUMNS))}{max(row_number - 1, header_row)}"

        buffer = BytesIO()
        wb.save(buffer)

        summary_parts = [f"{len(rows)} rows"]
        if actor_name:
            summary_parts.append(f"user: {actor_name}")
        if target_type:
            summary_parts.append(f"type: {target_type}")
        if action:
            summary_parts.append(f"action: {action}")
        if ip_address:
            summary_parts.append(f"ip: {ip_address}")
        if date_from:
            summary_parts.append(f"from: {_fmt(date_from)}")
        if date_to:
            summary_parts.append(f"to: {_fmt(date_to - timedelta(seconds=1))}")
        if search:
            summary_parts.append(f"search: {search}")
        if truncated:
            summary_parts.append("truncated")

        return {
            "content": buffer.getvalue(),
            "filename": f"audit-log-{datetime.now(EAT).strftime('%Y-%m-%d')}.xlsx",
            "summary": "; ".join(summary_parts),
        }