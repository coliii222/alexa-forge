from pathlib import Path
from uuid import uuid4
from fastapi import APIRouter, File, UploadFile, HTTPException

router = APIRouter()
UPLOAD_DIR = Path(__file__).resolve().parent.parent / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
ALLOWED = {"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp", "video/mp4": ".mp4", "video/webm": ".webm", "video/quicktime": ".mov"}

@router.post('/image')
async def upload_image(file: UploadFile = File(...)):
    if file.content_type not in ALLOWED:
        raise HTTPException(400, 'Unsupported image type')
    ext = ALLOWED[file.content_type]
    name = f"{uuid4().hex}{ext}"
    dest = UPLOAD_DIR / name
    content = await file.read()
    dest.write_bytes(content)
    return {"filename": name, "url": f"/uploads/{name}", "content_type": file.content_type, "size": len(content)}
