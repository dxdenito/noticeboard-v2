import os
import uuid
from fastapi import UploadFile

from app.core.config import settings


async def save_upload_file(
    file: UploadFile, subfolder: str = "notices"
) -> tuple[str, int]:
    """Saves an uploaded file to local disk under a unique name.
    Returns (relative_file_path, file_size_in_bytes)."""
    folder_path = os.path.join(settings.UPLOAD_DIR, subfolder)
    os.makedirs(folder_path, exist_ok=True)

    extension = os.path.splitext(file.filename or "")[1]
    unique_name = f"{uuid.uuid4()}{extension}"
    full_path = os.path.join(folder_path, unique_name)

    contents = await file.read()
    with open(full_path, "wb") as f:
        f.write(contents)

    return full_path, len(contents)
