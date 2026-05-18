"""SQLite persistent store for Alexa Forge."""

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
            CREATE TABLE IF NOT EXISTS vault_keys (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                provider TEXT NOT NULL,
                label TEXT NOT NULL,
                secret_encrypted TEXT NOT NULL,
                priority INTEGER DEFAULT 0,
                is_active INTEGER DEFAULT 1,
                is_limited INTEGER DEFAULT 0,
                cooldown_until TEXT,
                success_count INTEGER DEFAULT 0,
                error_count INTEGER DEFAULT 0,
                created_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS tasks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
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
                created_at TEXT NOT NULL,
                finished_at TEXT
            );
        """)


def now() -> str:
    return datetime.now(timezone.utc).isoformat()


# --- Vault operations ---

def create_key(provider: str, label: str, secret_encrypted: str, priority: int = 0) -> dict:
    with get_db() as conn:
        cur = conn.execute(
            "INSERT INTO vault_keys (provider, label, secret_encrypted, priority, created_at) VALUES (?,?,?,?,?)",
            (provider, label, secret_encrypted, priority, now()),
        )
        return dict(conn.execute("SELECT * FROM vault_keys WHERE id=?", (cur.lastrowid,)).fetchone())


def list_keys() -> list[dict]:
    with get_db() as conn:
        return [dict(r) for r in conn.execute("SELECT * FROM vault_keys ORDER BY priority DESC").fetchall()]


def active_keys(provider: str | None = None) -> list[dict]:
    with get_db() as conn:
        if provider:
            rows = conn.execute(
                "SELECT * FROM vault_keys WHERE is_active=1 AND is_limited=0 AND provider=? ORDER BY priority DESC",
                (provider,),
            ).fetchall()
        else:
            rows = conn.execute(
                "SELECT * FROM vault_keys WHERE is_active=1 AND is_limited=0 ORDER BY priority DESC"
            ).fetchall()
        return [dict(r) for r in rows]


def increment_key_success(key_id: int):
    with get_db() as conn:
        conn.execute("UPDATE vault_keys SET success_count = success_count + 1 WHERE id=?", (key_id,))


def increment_key_error(key_id: int):
    with get_db() as conn:
        conn.execute("UPDATE vault_keys SET error_count = error_count + 1 WHERE id=?", (key_id,))


# --- Task operations ---

def create_task(task_data: dict) -> dict:
    with get_db() as conn:
        metadata_json = json.dumps(task_data.get("metadata")) if task_data.get("metadata") else None
        cur = conn.execute(
            """INSERT INTO tasks (type, mode, provider, status, prompt, image_url, output_url, error, provider_task_id, metadata, created_at, finished_at)
               VALUES (?,?,?,?,?,?,?,?,?,?,?,?)""",
            (
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


def list_tasks(limit: int = 50) -> list[dict]:
    with get_db() as conn:
        rows = conn.execute("SELECT * FROM tasks ORDER BY id DESC LIMIT ?", (limit,)).fetchall()
        return [_row_to_task(r) for r in rows]


def get_task(task_id: int) -> dict | None:
    with get_db() as conn:
        return _get_task(conn, task_id)


def _get_task(conn, task_id: int) -> dict | None:
    row = conn.execute("SELECT * FROM tasks WHERE id=?", (task_id,)).fetchone()
    if not row:
        return None
    return _row_to_task(row)


def _row_to_task(row) -> dict:
    d = dict(row)
    if d.get("metadata"):
        try:
            d["metadata"] = json.loads(d["metadata"])
        except (json.JSONDecodeError, TypeError):
            pass
    return d
