# app/routes/courses.py
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import require_roles, get_db
from app.services.course_service import CourseService
from app.schemas.course_schema import CourseCreate, CourseRead
from app.models.user import User

router = APIRouter(prefix="/courses", tags=["courses"])


@router.post("/", response_model=CourseRead)
async def create_course(
    data: CourseCreate,
    current_user: User = Depends(require_roles("super_admin", "web_admin")),
    db: AsyncSession = Depends(get_db),
):
    service = CourseService(db)
    return await service.create(data)


@router.get("/", response_model=list[CourseRead])
async def list_courses(db: AsyncSession = Depends(get_db)):
    service = CourseService(db)
    return await service.list_all()


@router.get("/{id}", response_model=CourseRead)
async def get_course(id: int, db: AsyncSession = Depends(get_db)):
    service = CourseService(db)
    return await service.get_by_id(id)

@router.patch("/{id}/reassign-notices")
async def reassign_course_notices(
    id: int,
    to_id: int,
    current_user: User = Depends(require_roles("super_admin")),
    db: AsyncSession = Depends(get_db),
):
    service = CourseService(db)
    return await service.reassign_notices(id, to_id)


@router.delete("/{id}", status_code=204)
async def delete_course(
    id: int,
    current_user: User = Depends(require_roles("super_admin")),
    db: AsyncSession = Depends(get_db),
):
    service = CourseService(db)
    await service.delete(current_user,id)