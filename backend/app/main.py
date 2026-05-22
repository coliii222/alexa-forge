from contextlib import asynccontextmanager
import asyncio
import logging

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
from app.credit_routes import router as credit_router
from app.assets import router as assets_router
from app.favorites import router as favorites_router
from app.engagement import router as engagement_router
from app.scheduled import router as scheduled_router
from app.database import init_db
from app.config import settings

logger = logging.getLogger("alexa-forge")


async def _poll_loop():
    """Background loop: poll running tasks every 10s."""
    from app.tasks.polling import poll_pending_tasks
    await asyncio.sleep(3)  # wait for app startup
    logger.info("Poll loop started")
    while True:
        try:
            results = await asyncio.to_thread(poll_pending_tasks, 20)
            if results:
                completed = sum(1 for r in results if r.get("status") == "completed")
                failed = sum(1 for r in results if r.get("status") == "failed")
                if completed or failed:
                    logger.info(f"Poll cycle: {completed} completed, {failed} failed, {len(results)} total")
        except Exception as exc:
            logger.error(f"Poll loop error: {exc}")
        await asyncio.sleep(10)


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    task = asyncio.create_task(_poll_loop())
    yield
    task.cancel()


app = FastAPI(title="Alexa Forge", version="1.0.0", redirect_slashes=False, lifespan=lifespan)

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
app.include_router(credit_router, prefix="/api/credits", tags=["credits"])
app.include_router(assets_router, prefix="/api/assets", tags=["assets"])
app.include_router(favorites_router, prefix="/api/favorites", tags=["favorites"])
app.include_router(engagement_router, prefix="/api/engagement", tags=["engagement"])
app.include_router(scheduled_router, prefix="/api/scheduled", tags=["scheduled"])
app.mount("/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")


@app.get("/health")
def health():
    return {"ok": True, "service": "alexa-forge", "version": "1.0.0"}


@app.get("/api/models")
def list_models():
    """List available models grouped by category."""
    from app.providers.fal import MODELS
    return MODELS
