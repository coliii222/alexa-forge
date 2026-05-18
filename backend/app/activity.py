"""Activity log: track all important user actions."""

from app.database import get_db, now


def init_activity_tables():
    with get_db() as conn:
        conn.executescript("""
            CREATE TABLE IF NOT EXISTS activity_log (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                module TEXT NOT NULL,
                action TEXT NOT NULL,
                status TEXT DEFAULT 'info',
                detail TEXT,
                meta TEXT,
                created_at TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id)
            );
            CREATE INDEX IF NOT EXISTS idx_activity_user ON activity_log(user_id);
            CREATE INDEX IF NOT EXISTS idx_activity_module ON activity_log(module);
            CREATE INDEX IF NOT EXISTS idx_activity_created ON activity_log(created_at DESC);
        """)


def log_activity(user_id: int, module: str, action: str, status: str = "info", detail: str = None, meta: str = None):
    """Log an activity event. Call this from any module."""
    with get_db() as conn:
        conn.execute(
            "INSERT INTO activity_log (user_id, module, action, status, detail, meta, created_at) VALUES (?,?,?,?,?,?,?)",
            (user_id, module, action, status, detail, meta, now()),
        )


def get_activities(user_id: int = None, module: str = None, limit: int = 100, offset: int = 0) -> list[dict]:
    with get_db() as conn:
        query = "SELECT * FROM activity_log WHERE 1=1"
        params = []
        if user_id:
            query += " AND user_id=?"
            params.append(user_id)
        if module:
            query += " AND module=?"
            params.append(module)
        query += " ORDER BY id DESC LIMIT ? OFFSET ?"
        params.extend([limit, offset])
        return [dict(r) for r in conn.execute(query, params).fetchall()]


def get_activity_summary(user_id: int = None) -> dict:
    with get_db() as conn:
        where = "WHERE user_id=?" if user_id else ""
        params = [user_id] if user_id else []

        total = conn.execute(f"SELECT COUNT(*) FROM activity_log {where}", params).fetchone()[0]
        warnings = conn.execute(f"SELECT COUNT(*) FROM activity_log {where} {'AND' if where else 'WHERE'} status IN ('warning','failed')", params).fetchone()[0]

        modules = {}
        for row in conn.execute(f"SELECT module, COUNT(*) as cnt FROM activity_log {where} GROUP BY module", params).fetchall():
            modules[row[0]] = row[1]

        return {"total": total, "warnings": warnings, "by_module": modules}
