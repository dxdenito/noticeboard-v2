from google.oauth2 import id_token as google_id_token
from google.auth.transport import requests as google_requests

from app.core.config import settings

_google_request = google_requests.Request()


def verify_google_id_token(token: str) -> str | None:
    try:
        payload = google_id_token.verify_oauth2_token(
            token, _google_request, settings.google_client_id
        )
    except ValueError:
        return None

    email = payload.get("email")
    if not email or not payload.get("email_verified"):
        return None

    return email