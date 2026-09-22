from fastapi import APIRouter, Response, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.google_auth import verify_google_id_token
from app.core.security import create_audience_token
from app.core.deps import get_db
from app.core.config import settings
from app.services.institutional_domain_service import InstitutionalDomainService
from app.schemas.audience_schema import AudienceVerifyRequest, AudienceVerifyResponse

router = APIRouter(prefix="/audience", tags=["audience"])


@router.post("/verify", response_model=AudienceVerifyResponse)
async def verify_audience(data: AudienceVerifyRequest, response: Response, db: AsyncSession = Depends(get_db)):
    email = verify_google_id_token(data.id_token)
    if email is None:
        raise HTTPException(400, "Could not verify this Google sign-in")

    domain_service = InstitutionalDomainService(db)
    audience = await domain_service.resolve_audience(email)
    if audience is None:
        raise HTTPException(400, "This email doesn't match a recognized institutional domain")

    token = create_audience_token(audience.value)
    response.set_cookie(
        key="audience_token",
        value=token,
        httponly=True,
        secure=settings.cross_origin_cookies,
        samesite="none" if settings.cross_origin_cookies else "lax",
    )
    return AudienceVerifyResponse(audience=audience.value)