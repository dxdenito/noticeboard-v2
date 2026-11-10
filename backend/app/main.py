import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.core.config import settings
from app.core.client_ip import capture_client_ip
from app.core.limiter import limiter
from app.routes.auth import router as auth_router
from app.routes.users import router as user_router
from app.routes.notices import router as notice_router
from app.routes.categories import router as categories_router
from app.routes.audience import router as audience_router
from app.routes.attachments import router as attachment_router, download_router
from app.routes.admin_scope import router as admin_scope_router
from app.routes.org_units import router as org_unit_router
from app.routes.audit_logs import router as audit_log_router
from app.routes.roles import router as role_router
from app.routes.institutional_domains import router as institutional_domain_router
from app.routes.notifications import router as notification_router
from app.routes.events import router as event_router
from app.routes.digest import router as digest_router
from app.services.digest_service import scheduler_loop


@asynccontextmanager
async def lifespan(app: FastAPI):
    scheduler_task = None
    if settings.digest_scheduler_enabled:
        scheduler_task = asyncio.create_task(scheduler_loop())
    yield
    if scheduler_task is not None:
        scheduler_task.cancel()
        try:
            await scheduler_task
        except asyncio.CancelledError:
            pass


app = FastAPI(title="Noticeboard API", dependencies=[Depends(capture_client_ip)], lifespan=lifespan)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(user_router)
app.include_router(audience_router)
app.include_router(categories_router)
app.include_router(notice_router)
app.include_router(attachment_router)
app.include_router(download_router)
app.include_router(admin_scope_router)
app.include_router(org_unit_router)
app.include_router(audit_log_router)
app.include_router(role_router)
app.include_router(institutional_domain_router)
app.include_router(notification_router)
app.include_router(event_router)
app.include_router(digest_router)


@app.get("/health")
def health_check() -> dict:
    return {"status": "ok"}