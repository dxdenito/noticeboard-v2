# app/routes/clubs.py
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import require_roles, get_db
from app.services.club_service import ClubService
from app.schemas.club_schema import ClubCreate, ClubRead
from app.models.user import User

router = APIRouter(prefix="/clubs", tags=["clubs"])


@router.post("/", response_model=ClubRead)
async def create_club(
    data: ClubCreate,
    current_user: User = Depends(require_roles("super_admin", "web_admin")),
    db: AsyncSession = Depends(get_db),
):
    service = ClubService(db)
    return await service.create(data)


@router.get("/", response_model=list[ClubRead])
async def list_clubs(db: AsyncSession = Depends(get_db)):
    service = ClubService(db)
    return await service.list_all()


@router.get("/{id}", response_model=ClubRead)
async def get_club(id: int, db: AsyncSession = Depends(get_db)):
    service = ClubService(db)
    return await service.get_by_id(id)

@router.patch("/{id}/reassign-notices")
async def reassign_club_notices(
    id: int,
    to_id: int,
    current_user: User = Depends(require_roles("super_admin")),
    db: AsyncSession = Depends(get_db),
):
    service = ClubService(db)
    return await service.reassign_notices(id, to_id)


@router.delete("/{id}", status_code=204)
async def delete_club(
    id: int,
    current_user: User = Depends(require_roles("super_admin")),
    db: AsyncSession = Depends(get_db),
):
    service = ClubService(db)
    await service.delete(current_user,id)