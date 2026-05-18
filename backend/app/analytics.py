"""Analytics API: cost tracking, latency, throughput per provider/user."""

from fastapi import APIRouter, Depends, Query
from app.auth import get_current_user, require_admin
from app.database import get_db

router = APIRouter()


@router.get("/overview")
def analytics_overview(user: dict = Depends(get_current_user)):
    """Per-user analytics overview."""
    uid = user["id"]
    with get_db() as conn:
        total_tasks = conn.execute("SELECT COUNT(*) FROM tasks WHERE user_id=?", (uid,)).fetchone()[0]
        completed = conn.execute("SELECT COUNT(*) FROM tasks WHERE user_id=? AND status='completed'", (uid,)).fetchone()[0]
        failed = conn.execute("SELECT COUNT(*) FROM tasks WHERE user_id=? AND status='failed'", (uid,)).fetchone()[0]

        # Provider breakdown
        providers = [dict(r) for r in conn.execute(
            "SELECT provider, COUNT(*) as count, SUM(CASE WHEN status='completed' THEN 1 ELSE 0 END) as success FROM tasks WHERE user_id=? GROUP BY provider",
            (uid,),
        ).fetchall()]

        # Recent 7 days daily counts
        daily = [dict(r) for r in conn.execute(
            "SELECT DATE(created_at) as day, COUNT(*) as count FROM tasks WHERE user_id=? AND created_at >= datetime('now', '-7 days') GROUP BY DATE(created_at) ORDER BY day",
            (uid,),
        ).fetchall()]

    return {
        "total_tasks": total_tasks,
        "completed": completed,
        "failed": failed,
        "success_rate": round(completed / total_tasks * 100, 1) if total_tasks > 0 else 0,
        "by_provider": providers,
        "daily_7d": daily,
    }


@router.get("/global")
def analytics_global(admin: dict = Depends(require_admin)):
    """Admin-only global analytics."""
    with get_db() as conn:
        total_tasks = conn.execute("SELECT COUNT(*) FROM tasks").fetchone()[0]
        completed = conn.execute("SELECT COUNT(*) FROM tasks WHERE status='completed'").fetchone()[0]
        failed = conn.execute("SELECT COUNT(*) FROM tasks WHERE status='failed'").fetchone()[0]
        total_users = conn.execute("SELECT COUNT(*) FROM users").fetchone()[0]
        active_keys = conn.execute("SELECT COUNT(*) FROM vault_keys WHERE is_active=1").fetchone()[0]

        # Top users by task count
        top_users = [dict(r) for r in conn.execute(
            "SELECT u.username, COUNT(t.id) as task_count FROM tasks t JOIN users u ON t.user_id=u.id GROUP BY t.user_id ORDER BY task_count DESC LIMIT 10"
        ).fetchall()]

        # Provider stats
        provider_stats = [dict(r) for r in conn.execute(
            "SELECT provider, COUNT(*) as total, SUM(CASE WHEN status='completed' THEN 1 ELSE 0 END) as success, SUM(CASE WHEN status='failed' THEN 1 ELSE 0 END) as errors FROM tasks GROUP BY provider"
        ).fetchall()]

        # Daily trend 30 days
        daily = [dict(r) for r in conn.execute(
            "SELECT DATE(created_at) as day, COUNT(*) as count FROM tasks WHERE created_at >= datetime('now', '-30 days') GROUP BY DATE(created_at) ORDER BY day"
        ).fetchall()]

    return {
        "total_tasks": total_tasks,
        "completed": completed,
        "failed": failed,
        "success_rate": round(completed / total_tasks * 100, 1) if total_tasks > 0 else 0,
        "total_users": total_users,
        "active_keys": active_keys,
        "top_users": top_users,
        "provider_stats": provider_stats,
        "daily_30d": daily,
    }
