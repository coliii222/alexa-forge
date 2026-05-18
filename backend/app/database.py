"""Updated database with multi-user support (user_id columns)."""

import sqlite3
import json
from pathlib import Path
from datetime import datetime, timezone
from contextlib import contextmanager

DB_PATH = Path(__file__).resolve().parent.parent / "data" / "forge.db"
DB_PATH.parent.mkdir(parents=True, exist_ok=True)


def _connect() -> sqlite3.Connection:
    conn = sqlite3.connect(str(DB_PATH), check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


@contextmanager
def get_db():
    conn = _connect()
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def init_db():
    with get_db() as conn:
        conn.executescript("""
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                email TEXT DEFAULT '',
                password_hash TEXT NOT NULL,
                salt TEXT NOT NULL,
                role TEXT DEFAULT 'user',
                is_active INTEGER DEFAULT 1,
                created_at TEXT NOT NULL,
                last_login TEXT
            );

            CREATE TABLE IF NOT EXISTS vault_keys (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                provider TEXT NOT NULL,
                label TEXT NOT NULL,
                secret_encrypted TEXT NOT NULL,
                priority INTEGER DEFAULT 0,
                is_active INTEGER DEFAULT 1,
                is_limited INTEGER DEFAULT 0,
                cooldown_until TEXT,
                success_count INTEGER DEFAULT 0,
                error_count INTEGER DEFAULT 0,
                created_at TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id)
            );

            CREATE TABLE IF NOT EXISTS tasks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                type TEXT NOT NULL DEFAULT 'video',
                mode TEXT NOT NULL DEFAULT 'image_to_video',
                provider TEXT NOT NULL DEFAULT 'fake',
                status TEXT NOT NULL DEFAULT 'queued',
                prompt TEXT,
                image_url TEXT,
                output_url TEXT,
                error TEXT,
                provider_task_id TEXT,
                metadata TEXT,
                campaign_id INTEGER,
                created_at TEXT NOT NULL,
                finished_at TEXT,
                FOREIGN KEY (user_id) REFERENCES users(id)
            );

            CREATE TABLE IF NOT EXISTS campaigns (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                name TEXT NOT NULL,
                description TEXT,
                status TEXT DEFAULT 'active',
                created_at TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id)
            );

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

            CREATE INDEX IF NOT EXISTS idx_vault_user ON vault_keys(user_id);
            CREATE INDEX IF NOT EXISTS idx_tasks_user ON tasks(user_id);
            CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
            CREATE INDEX IF NOT EXISTS idx_tasks_campaign ON tasks(campaign_id);
            CREATE INDEX IF NOT EXISTS idx_activity_user ON activity_log(user_id);
            CREATE INDEX IF NOT EXISTS idx_activity_created ON activity_log(created_at DESC);

            CREATE TABLE IF NOT EXISTS credits (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL UNIQUE,
                balance INTEGER NOT NULL DEFAULT 5,
                free_refreshed_at TEXT NOT NULL,
                total_earned INTEGER NOT NULL DEFAULT 0,
                total_spent INTEGER NOT NULL DEFAULT 0,
                FOREIGN KEY (user_id) REFERENCES users(id)
            );

            CREATE TABLE IF NOT EXISTS credit_transactions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                amount INTEGER NOT NULL,
                type TEXT NOT NULL,
                reason TEXT,
                created_at TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id)
            );

            CREATE TABLE IF NOT EXISTS payment_orders (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                order_id TEXT UNIQUE NOT NULL,
                provider TEXT NOT NULL DEFAULT 'midtrans',
                package_id TEXT NOT NULL,
                credits INTEGER NOT NULL,
                amount_idr INTEGER NOT NULL,
                status TEXT NOT NULL DEFAULT 'pending',
                checkout_url TEXT,
                provider_reference TEXT,
                error TEXT,
                created_at TEXT NOT NULL,
                paid_at TEXT,
                FOREIGN KEY (user_id) REFERENCES users(id)
            );

            CREATE INDEX IF NOT EXISTS idx_credits_user ON credits(user_id);
            CREATE INDEX IF NOT EXISTS idx_credit_tx_user ON credit_transactions(user_id);
            CREATE INDEX IF NOT EXISTS idx_payment_orders_user ON payment_orders(user_id);
            CREATE INDEX IF NOT EXISTS idx_payment_orders_order ON payment_orders(order_id);

            CREATE TABLE IF NOT EXISTS assets (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                filename TEXT NOT NULL,
                url TEXT NOT NULL,
                media_type TEXT NOT NULL,
                category TEXT DEFAULT 'image',
                original_name TEXT,
                size INTEGER DEFAULT 0,
                created_at TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id)
            );

            CREATE INDEX IF NOT EXISTS idx_assets_user ON assets(user_id);
            CREATE INDEX IF NOT EXISTS idx_assets_category ON assets(user_id, category);

            CREATE TABLE IF NOT EXISTS favorites (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                task_id INTEGER NOT NULL,
                created_at TEXT NOT NULL,
                UNIQUE(user_id, task_id),
                FOREIGN KEY (user_id) REFERENCES users(id),
                FOREIGN KEY (task_id) REFERENCES tasks(id)
            );

            CREATE INDEX IF NOT EXISTS idx_favorites_user ON favorites(user_id);
            CREATE INDEX IF NOT EXISTS idx_favorites_task ON favorites(task_id);

            CREATE TABLE IF NOT EXISTS task_events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                task_id INTEGER NOT NULL,
                event_type TEXT NOT NULL,
                meta TEXT,
                created_at TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id),
                FOREIGN KEY (task_id) REFERENCES tasks(id)
            );

            CREATE INDEX IF NOT EXISTS idx_task_events_user ON task_events(user_id);
            CREATE INDEX IF NOT EXISTS idx_task_events_task ON task_events(task_id);
            CREATE INDEX IF NOT EXISTS idx_task_events_type ON task_events(event_type);

            CREATE TABLE IF NOT EXISTS scheduled_posts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                task_id INTEGER NOT NULL,
                platform TEXT NOT NULL,
                scheduled_at TEXT NOT NULL,
                caption TEXT,
                status TEXT NOT NULL DEFAULT 'scheduled',
                error TEXT,
                created_at TEXT NOT NULL,
                posted_at TEXT,
                FOREIGN KEY (user_id) REFERENCES users(id),
                FOREIGN KEY (task_id) REFERENCES tasks(id)
            );

            CREATE INDEX IF NOT EXISTS idx_scheduled_user ON scheduled_posts(user_id);
            CREATE INDEX IF NOT EXISTS idx_scheduled_status ON scheduled_posts(status);
            CREATE INDEX IF NOT EXISTS idx_scheduled_at ON scheduled_posts(scheduled_at);
        """)


def now() -> str:
    return datetime.now(timezone.utc).isoformat()


# --- Vault operations ---

def create_key(user_id: int, provider: str, label: str, secret_encrypted: str, priority: int = 0) -> dict:
    with get_db() as conn:
        cur = conn.execute(
            "INSERT INTO vault_keys (user_id, provider, label, secret_encrypted, priority, created_at) VALUES (?,?,?,?,?,?)",
            (user_id, provider, label, secret_encrypted, priority, now()),
        )
        return dict(conn.execute("SELECT * FROM vault_keys WHERE id=?", (cur.lastrowid,)).fetchone())


def list_keys(user_id: int = None) -> list[dict]:
    with get_db() as conn:
        if user_id:
            return [dict(r) for r in conn.execute("SELECT * FROM vault_keys WHERE user_id=? ORDER BY priority DESC", (user_id,)).fetchall()]
        return [dict(r) for r in conn.execute("SELECT * FROM vault_keys ORDER BY priority DESC").fetchall()]


def active_keys(provider: str | None = None, user_id: int = None) -> list[dict]:
    with get_db() as conn:
        query = "SELECT * FROM vault_keys WHERE is_active=1 AND is_limited=0"
        params = []
        if user_id:
            query += " AND user_id=?"
            params.append(user_id)
        if provider:
            query += " AND provider=?"
            params.append(provider)
        query += " ORDER BY priority DESC"
        return [dict(r) for r in conn.execute(query, params).fetchall()]


def increment_key_success(key_id: int):
    with get_db() as conn:
        conn.execute("UPDATE vault_keys SET success_count = success_count + 1 WHERE id=?", (key_id,))


def increment_key_error(key_id: int):
    with get_db() as conn:
        conn.execute("UPDATE vault_keys SET error_count = error_count + 1 WHERE id=?", (key_id,))


def delete_key(key_id: int, user_id: int) -> bool:
    with get_db() as conn:
        cur = conn.execute("DELETE FROM vault_keys WHERE id=? AND user_id=?", (key_id, user_id))
        return cur.rowcount > 0


def toggle_key(key_id: int, user_id: int, active: bool) -> bool:
    with get_db() as conn:
        cur = conn.execute("UPDATE vault_keys SET is_active=? WHERE id=? AND user_id=?", (int(active), key_id, user_id))
        return cur.rowcount > 0


# --- Task operations ---

def create_task(task_data: dict) -> dict:
    with get_db() as conn:
        metadata_json = json.dumps(task_data.get("metadata")) if task_data.get("metadata") else None
        cur = conn.execute(
            """INSERT INTO tasks (user_id, type, mode, provider, status, prompt, image_url, output_url, error, provider_task_id, metadata, campaign_id, created_at, finished_at)
               VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
            (
                task_data.get("user_id"),
                task_data.get("type", "video"),
                task_data.get("mode", "image_to_video"),
                task_data.get("provider", "fake"),
                task_data.get("status", "queued"),
                task_data.get("prompt"),
                task_data.get("image_url"),
                task_data.get("output_url"),
                task_data.get("error"),
                task_data.get("provider_task_id"),
                metadata_json,
                task_data.get("campaign_id"),
                task_data.get("created_at", now()),
                task_data.get("finished_at"),
            ),
        )
        return _get_task(conn, cur.lastrowid)


def update_task(task_id: int, updates: dict) -> dict:
    with get_db() as conn:
        sets = []
        vals = []
        for k, v in updates.items():
            if k == "metadata":
                v = json.dumps(v) if v else None
            sets.append(f"{k}=?")
            vals.append(v)
        vals.append(task_id)
        conn.execute(f"UPDATE tasks SET {','.join(sets)} WHERE id=?", vals)
        return _get_task(conn, task_id)


def list_tasks(user_id: int = None, limit: int = 50, status: str = None) -> list[dict]:
    with get_db() as conn:
        query = "SELECT * FROM tasks WHERE 1=1"
        params = []
        if user_id:
            query += " AND user_id=?"
            params.append(user_id)
        if status:
            query += " AND status=?"
            params.append(status)
        query += " ORDER BY id DESC LIMIT ?"
        params.append(limit)
        return [_row_to_task(r) for r in conn.execute(query, params).fetchall()]


def get_task(task_id: int, user_id: int = None) -> dict | None:
    with get_db() as conn:
        if user_id:
            row = conn.execute("SELECT * FROM tasks WHERE id=? AND user_id=?", (task_id, user_id)).fetchone()
        else:
            row = conn.execute("SELECT * FROM tasks WHERE id=?", (task_id,)).fetchone()
        return _row_to_task(row) if row else None


def _get_task(conn, task_id: int) -> dict | None:
    row = conn.execute("SELECT * FROM tasks WHERE id=?", (task_id,)).fetchone()
    return _row_to_task(row) if row else None


def _row_to_task(row) -> dict:
    d = dict(row)
    if d.get("metadata"):
        try:
            d["metadata"] = json.loads(d["metadata"])
        except (json.JSONDecodeError, TypeError):
            pass
    return d


# --- Campaign operations ---

def create_campaign(user_id: int, name: str, description: str = None) -> dict:
    with get_db() as conn:
        cur = conn.execute(
            "INSERT INTO campaigns (user_id, name, description, created_at) VALUES (?,?,?,?)",
            (user_id, name, description, now()),
        )
        return dict(conn.execute("SELECT * FROM campaigns WHERE id=?", (cur.lastrowid,)).fetchone())


def list_campaigns(user_id: int) -> list[dict]:
    with get_db() as conn:
        campaigns = [dict(r) for r in conn.execute(
            "SELECT * FROM campaigns WHERE user_id=? ORDER BY id DESC", (user_id,)
        ).fetchall()]
        for c in campaigns:
            c["task_count"] = conn.execute("SELECT COUNT(*) FROM tasks WHERE campaign_id=?", (c["id"],)).fetchone()[0]
        return campaigns
