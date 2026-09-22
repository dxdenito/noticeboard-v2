from pydantic import BaseModel

class AudienceVerifyRequest(BaseModel):
    id_token: str

class AudienceVerifyResponse(BaseModel):
    audience: str