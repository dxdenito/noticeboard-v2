from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

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


app = FastAPI(title="Noticeboard V2 API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173","https://59c8-41-204-187-5.ngrok-free.app","http://10.96.176.30:5173","http://192.168.137.1:5173","http://192.168.0.103:5173","http://192.168.100.75:5173"],
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

@app.get("/health")
def health_check() -> dict:
    return {"status": "ok"}