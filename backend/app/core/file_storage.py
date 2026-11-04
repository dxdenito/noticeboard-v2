import os
import uuid
from fastapi import UploadFile, HTTPException

from app.core.config import settings

IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".webp"}
DOCUMENT_EXTENSIONS = {".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx", ".txt", ".csv"}
ALLOWED_EXTENSIONS = IMAGE_EXTENSIONS | DOCUMENT_EXTENSIONS
MAX_UPLOAD_BYTES = 20 * 1024 * 1024
CHUNK_SIZE = 1024 * 1024


async def save_upload_file(
    file: UploadFile,
    subfolder: str = "notices",
    allowed_extensions: set[str] | None = None,
) -> tuple[str, int]:
    allowed = allowed_extensions or ALLOWED_EXTENSIONS
    extension = os.path.splitext(file.filename or "")[1].lower()
    if extension not in allowed:
        raise HTTPException(400, "This file type isn't allowed")

    folder_path = os.path.join(settings.UPLOAD_DIR, subfolder)
    os.makedirs(folder_path, exist_ok=True)

    full_path = os.path.join(folder_path, f"{uuid.uuid4()}{extension}")
    size = 0

    try:
        with open(full_path, "wb") as f:
            while True:
                chunk = await file.read(CHUNK_SIZE)
                if not chunk:
                    break
                size += len(chunk)
                if size > MAX_UPLOAD_BYTES:
                    raise HTTPException(413, "File is too large (20 MB maximum)")
                f.write(chunk)
    except HTTPException:
        if os.path.exists(full_path):
            os.remove(full_path)
        raise

    return full_path, size