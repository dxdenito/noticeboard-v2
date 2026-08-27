from fastapi import APIRouter, Response, HTTPException
from app.core.audience_verification import verify_institutional_email
from app.core.security import create_audience_token
from app.schemas.audience_schema import AudienceVerifyRequest, AudienceVerifyResponse

router = APIRouter(prefix="/audience", tags=["audience"])


@router.post("/verify", response_model=AudienceVerifyResponse)
async def verify_audience(data: AudienceVerifyRequest, response: Response):
    audience = verify_institutional_email(data.email)
    if audience is None:
        raise HTTPException(400, "This email doesn't match a recognized institutional domain")

    token = create_audience_token(audience.value)
    response.set_cookie(
        key="audience_token",
        value=token,
        httponly=True,
        secure=False,  # switch to True on HTTPS in production
        samesite="lax",
        max_age=24 * 60 * 60,
    )
    return AudienceVerifyResponse(audience=audience.value)