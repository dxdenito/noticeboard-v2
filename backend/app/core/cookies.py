from app.core.config import settings


def auth_cookie_flags() -> dict:
    return {
        "httponly": True,
        "secure": settings.cross_origin_cookies or settings.cookie_secure,
        "samesite": "none" if settings.cross_origin_cookies else "lax",
    }