from pydantic import BaseModel

class AudienceVerifyRequest(BaseModel):
    email: str

class AudienceVerifyResponse(BaseModel):
    audience: str