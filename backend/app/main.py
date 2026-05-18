from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.vault.routes import router as vault_router
from app.tasks.routes import router as tasks_router
from app.presets.routes import router as presets_router
from app.uploads import router as uploads_router, UPLOAD_DIR
from app.database import init_db
from app.config import settings

app = FastAPI(title="Alexa Forge", version="0.2.0")

# CORS: allow Vercel domain + localhost dev
origins = [o.strip() for o in settings.cors_origins.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(vault_router, prefix="/v1/vault", tags=["vault"])
app.include_router(tasks_router, prefix="/v1", tags=["tasks"])
app.include_router(presets_router, prefix="/v1/presets", tags=["presets"])
app.include_router(uploads_router, prefix="/v1/uploads", tags=["uploads"])
app.mount("/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")


@app.on_event("startup")
def on_startup():
    init_db()


@app.get("/health")
def health():
    return {"ok": True, "service": "alexa-forge", "version": "0.2.0"}
