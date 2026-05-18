"""Admin API: user management, system stats, health monitoring."""

from fastapi import APIRouter, Depends
from app.auth import require_admin
from app.database import get_db

router = APIRouter()


@router.get("/users")
def list_users(admin: dict = Depends(require_admin)):
    with get_db() as conn:
        users = [dict(r) for r in conn.execute(
            "SELECT id, username, email, role, is_active, created_at, last_login FROM users ORDER BY id"
        ).fetchall()]

        for u in users:
            uid = u["id"]
            u["stats"] = {
                "api_keys": conn.execute("SELECT COUNT(*) FROM vault_keys WHERE user_id=?", (uid,)).fetchone()[0],
                "active_api_keys": conn.execute("SELECT COUNT(*) FROM vault_keys WHERE user_id=? AND is_active=1", (uid,)).fetchone()[0],
                "videos": conn.execute("SELECT COUNT(*) FROM tasks WHERE user_id=?", (uid,)).fetchone()[0],
                "completed_videos": conn.execute("SELECT COUNT(*) FROM tasks WHERE user_id=? AND status='completed'", (uid,)).fetchone()[0],
                "activities": conn.execute("SELECT COUNT(*) FROM activity_log WHERE user_id=?", (uid,)).fetchone()[0],
            }
    return users


@router.get("/users/summary")
def users_summary(admin: dict = Depends(require_admin)):
    with get_db() as conn:
        return {
            "total_users": conn.execute("SELECT COUNT(*) FROM users").fetchone()[0],
            "total_admins": conn.execute("SELECT COUNT(*) FROM users WHERE role='admin'").fetchone()[0],
            "total_regular_users": conn.execute("SELECT COUNT(*) FROM users WHERE role='user'").fetchone()[0],
            "total_api_keys": conn.execute("SELECT COUNT(*) FROM vault_keys").fetchone()[0],
            "total_videos": conn.execute("SELECT COUNT(*) FROM tasks").fetchone()[0],
            "total_completed": conn.execute("SELECT COUNT(*) FROM tasks WHERE status='completed'").fetchone()[0],
            "total_failed": conn.execute("SELECT COUNT(*) FROM tasks WHERE status='failed'").fetchone()[0],
            "total_activities": conn.execute("SELECT COUNT(*) FROM activity_log").fetchone()[0],
        }


@router.get("/health")
def system_health(admin: dict = Depends(require_admin)):
    """System health: DB size, table counts, provider status."""
    import os
    from app.database import DB_PATH

    db_size = os.path.getsize(DB_PATH) if DB_PATH.exists() else 0

    with get_db() as conn:
        tables = {}
        for tbl in ["users", "vault_keys", "tasks", "activity_log"]:
            tables[tbl] = conn.execute(f"SELECT COUNT(*) FROM {tbl}").fetchone()[0]

    return {
        "status": "healthy",
        "db_size_mb": round(db_size / 1024 / 1024, 2),
        "tables": tables,
    }
