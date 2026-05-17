from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.vault.routes import router as vault_router
from app.tasks.routes import router as tasks_router
from app.presets.routes import router as presets_router

app = FastAPI(title="Alexa Forge", version="0.1.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])
app.include_router(vault_router, prefix="/v1/vault", tags=["vault"])
app.include_router(tasks_router, prefix="/v1", tags=["tasks"])
app.include_router(presets_router, prefix="/v1/presets", tags=["presets"])

@app.get("/health")
def health(): return {"ok": True, "service": "alexa-forge"}
