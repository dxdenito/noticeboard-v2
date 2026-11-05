import csv
import io
from fastapi import HTTPException, UploadFile

MAX_CSV_BYTES = 1024 * 1024
MAX_CSV_ROWS = 2000
FORMULA_PREFIXES = ("=", "+", "-", "@", "\t", "\r")


def csv_safe(value) -> str:
    text = "" if value is None else str(value)
    if text and text[0] in FORMULA_PREFIXES:
        return "'" + text
    return text


def csv_unsafe(value: str) -> str:
    text = (value or "").strip()
    if len(text) > 1 and text[0] == "'" and text[1] in FORMULA_PREFIXES:
        return text[1:]
    return text


def build_csv(headers: list[str], rows: list[list]) -> bytes:
    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(headers)
    for row in rows:
        writer.writerow([csv_safe(cell) for cell in row])
    return ("\ufeff" + buffer.getvalue()).encode("utf-8")


async def read_csv_upload(file: UploadFile, required: tuple[str, ...]) -> list[tuple[int, dict[str, str]]]:
    if not (file.filename or "").lower().endswith(".csv"):
        raise HTTPException(400, "Upload a .csv file")

    raw = await file.read(MAX_CSV_BYTES + 1)
    if len(raw) > MAX_CSV_BYTES:
        raise HTTPException(413, "CSV file is too large (1 MB maximum)")

    try:
        text = raw.decode("utf-8-sig")
    except UnicodeDecodeError:
        try:
            text = raw.decode("cp1252")
        except UnicodeDecodeError:
            raise HTTPException(400, "Could not read this file. Save it as CSV (UTF-8) and try again")

    if not text.strip():
        raise HTTPException(400, "The file is empty")

    first_line = text.splitlines()[0]
    delimiter = ";" if first_line.count(";") > first_line.count(",") else ","

    reader = csv.DictReader(io.StringIO(text), delimiter=delimiter)
    if reader.fieldnames is None:
        raise HTTPException(400, "The file is empty")

    headers = [(name or "").strip().lower() for name in reader.fieldnames]
    missing = [column for column in required if column not in headers]
    if missing:
        raise HTTPException(400, f"Missing column(s): {', '.join(missing)}")
    reader.fieldnames = headers

    rows: list[tuple[int, dict[str, str]]] = []
    for line_number, row in enumerate(reader, start=2):
        cleaned = {
            key: csv_unsafe(value) if isinstance(value, str) else ""
            for key, value in row.items()
            if key is not None
        }
        if not any(cleaned.values()):
            continue
        rows.append((line_number, cleaned))
        if len(rows) > MAX_CSV_ROWS:
            raise HTTPException(400, f"Too many rows (maximum {MAX_CSV_ROWS})")

    if not rows:
        raise HTTPException(400, "The file has a header but no data rows")

    return rows