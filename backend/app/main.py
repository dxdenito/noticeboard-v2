from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes.auth import router as auth_router
from app.routes.users import router as user_router
from app.routes.notices import router as notice_router
from app.routes.categories import router as categories_router
from app.routes.clubs import router as clubs_router
from app.routes.courses import router as courses_router
from app.routes.departments import router as department_router
from app.routes.audience import router as audience_router
from app.routes.attachments import router as attachment_router, download_router 


app = FastAPI(title="Noticeboard V2 API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173","http://192.168.137.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(user_router)
app.include_router(audience_router)
app.include_router(department_router)
app.include_router(categories_router)
app.include_router(courses_router)
app.include_router(clubs_router)
app.include_router(notice_router)
app.include_router(attachment_router)
app.include_router(download_router)

@app.get("/health")
def health_check() -> dict:
    return {"status": "ok"}