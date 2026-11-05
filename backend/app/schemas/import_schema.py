from pydantic import BaseModel


class ImportRowIssue(BaseModel):
    line: int
    message: str


class ImportResult(BaseModel):
    dry_run: bool
    created: int
    skipped: int
    errors: list[ImportRowIssue]
    skipped_rows: list[ImportRowIssue]