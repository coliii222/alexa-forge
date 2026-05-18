from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.auth import router as auth_router
from app.vault.routes import router as vault_router
from app.tasks.routes import router as tasks_router
from app.presets.routes import router as presets_router
from app.uploads import router as uploads_router, UPLOAD_DIR
from app.admin import router as admin_router
from app.analytics import router as analytics_router
from app.activity_routes import router as activity_router
from app.campaigns import router as campaigns_router
from app.pipeline.routes import router as pipeline_router
from app.database import init_db
from app.config import settings

app = FastAPI(title="Alexa Forge", version="1.0.0", redirect_slashes=False)

# CORS
origins = [o.strip() for o in settings.cors_origins.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routes
app.include_router(auth_router, prefix="/api/auth", tags=["auth"])
app.include_router(vault_router, prefix="/api/vault", tags=["vault"])
app.include_router(tasks_router, prefix="/api", tags=["tasks"])
app.include_router(presets_router, prefix="/api/presets", tags=["presets"])
app.include_router(uploads_router, prefix="/api/uploads", tags=["uploads"])
app.include_router(admin_router, prefix="/api/admin", tags=["admin"])
app.include_router(analytics_router, prefix="/api/analytics", tags=["analytics"])
app.include_router(activity_router, prefix="/api/activity", tags=["activity"])
app.include_router(campaigns_router, prefix="/api/campaigns", tags=["campaigns"])
app.include_router(pipeline_router, prefix="/api/pipeline", tags=["pipeline"])
app.mount("/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")


@app.on_event("startup")
def on_startup():
    init_db()


@app.get("/health")
def health():
    return {"ok": True, "service": "alexa-forge", "version": "1.0.0"}
