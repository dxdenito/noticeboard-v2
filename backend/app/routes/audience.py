from fastapi import APIRouter, Response, HTTPException
from app.core.audience_verification import verify_institutional_email
from app.core.google_auth import verify_google_id_token
from app.core.security import create_audience_token
from app.schemas.audience_schema import AudienceVerifyRequest, AudienceVerifyResponse

router = APIRouter(prefix="/audience", tags=["audience"])


@router.post("/verify", response_model=AudienceVerifyResponse)
async def verify_audience(data: AudienceVerifyRequest, response: Response):
    email = verify_google_id_token(data.id_token)
    if email is None:
        raise HTTPException(400, "Could not verify this Google sign-in")

    audience = verify_institutional_email(email)
    if audience is None:
        raise HTTPException(400, "This email doesn't match a recognized institutional domain")

    token = create_audience_token(audience.value)
    response.set_cookie(
        key="audience_token",
        value=token,
        httponly=True,
        secure=False,  # switch to True on HTTPS in production
        samesite="lax",
    )
    return AudienceVerifyResponse(audience=audience.value)