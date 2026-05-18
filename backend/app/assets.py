"""Asset library: save uploaded images/videos for reuse."""

from fastapi import APIRouter, Depends, HTTPException, File, UploadFile
from pydantic import BaseModel
from typing import Optional
from uuid import uuid4
from pathlib import Path
from app.auth import get_current_user
from app.database import get_db, now

router = APIRouter()
ASSET_DIR = Path(__file__).resolve().parent.parent / "uploads" / "assets"
ASSET_DIR.mkdir(parents=True, exist_ok=True)

ALLOWED_TYPES = {
    "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp",
    "video/mp4": ".mp4", "video/webm": ".webm", "video/quicktime": ".mov",
}


@router.get("")
def list_assets(category: Optional[str] = None, user: dict = Depends(get_current_user)):
    """List user's saved assets."""
    with get_db() as db:
        if category:
            rows = db.execute(
                "SELECT * FROM assets WHERE user_id = ? AND category = ? ORDER BY created_at DESC",
                (user["id"], category)
            ).fetchall()
        else:
            rows = db.execute(
                "SELECT * FROM assets WHERE user_id = ? ORDER BY created_at DESC",
                (user["id"],)
            ).fetchall()
        return [dict(r) for r in rows]


@router.post("")
async def upload_asset(
    file: UploadFile = File(...),
    user: dict = Depends(get_current_user),
):
    """Upload and save an asset to the library."""
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(400, f"Unsupported file type: {file.content_type}")

    ext = ALLOWED_TYPES[file.content_type]
    filename = f"{uuid4().hex}{ext}"
    dest = ASSET_DIR / filename
    content = await file.read()
    dest.write_bytes(content)

    media_type = "image" if file.content_type.startswith("image") else "video"
    url = f"/uploads/assets/{filename}"

    with get_db() as db:
        db.execute(
            "INSERT INTO assets (user_id, filename, url, media_type, category, original_name, size, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            (user["id"], filename, url, media_type, media_type, file.filename, len(content), now())
        )
        db.commit()
        row = db.execute("SELECT * FROM assets WHERE filename = ?", (filename,)).fetchone()
        return dict(row)


class AssetUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None


@router.patch("/{asset_id}")
def update_asset(asset_id: int, body: AssetUpdate, user: dict = Depends(get_current_user)):
    """Update asset name or category."""
    with get_db() as db:
        row = db.execute("SELECT * FROM assets WHERE id = ? AND user_id = ?", (asset_id, user["id"])).fetchone()
        if not row:
            raise HTTPException(404, "Asset not found")
        updates = []
        params = []
        if body.name is not None:
            updates.append("original_name = ?")
            params.append(body.name)
        if body.category is not None:
            updates.append("category = ?")
            params.append(body.category)
        if updates:
            params.append(asset_id)
            db.execute(f"UPDATE assets SET {', '.join(updates)} WHERE id = ?", params)
            db.commit()
        row = db.execute("SELECT * FROM assets WHERE id = ?", (asset_id,)).fetchone()
        return dict(row)


@router.delete("/{asset_id}")
def delete_asset(asset_id: int, user: dict = Depends(get_current_user)):
    """Delete an asset."""
    with get_db() as db:
        row = db.execute("SELECT * FROM assets WHERE id = ? AND user_id = ?", (asset_id, user["id"])).fetchone()
        if not row:
            raise HTTPException(404, "Asset not found")
        # Delete file
        filepath = ASSET_DIR / row["filename"]
        if filepath.exists():
            filepath.unlink()
        db.execute("DELETE FROM assets WHERE id = ?", (asset_id,))
        db.commit()
        return {"ok": True, "deleted": asset_id}
