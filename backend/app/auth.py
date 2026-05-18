"""Authentication system: JWT tokens, user registration, role-based access."""

import sqlite3
import hashlib
import secrets
import time
import jwt
from datetime import datetime, timezone, timedelta
from functools import wraps
from fastapi import APIRouter, HTTPException, Depends, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from app.database import get_db, now

router = APIRouter()
security = HTTPBearer()

JWT_SECRET = None  # set in _get_jwt_secret()
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_HOURS = 72


def _get_jwt_secret() -> str:
    global JWT_SECRET
    if JWT_SECRET is None:
        from app.config import settings
        import hashlib
        JWT_SECRET = hashlib.sha256(f"jwt-{settings.vault_secret}".encode()).hexdigest()
    return JWT_SECRET


# --- Models ---

class RegisterRequest(BaseModel):
    username: str
    password: str
    email: str = ""


class LoginRequest(BaseModel):
    username: str
    password: str


# --- DB Schema ---

def init_auth_tables():
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
        """)


# --- Helpers ---

def _hash_password(password: str, salt: str) -> str:
    return hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 100000).hex()


def _create_token(user_id: int, username: str, role: str) -> str:
    payload = {
        "sub": str(user_id),
        "username": username,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRE_HOURS),
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, _get_jwt_secret(), algorithm=JWT_ALGORITHM)


def _decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, _get_jwt_secret(), algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(401, "Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(401, "Invalid token")


# --- Dependencies ---

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    payload = _decode_token(credentials.credentials)
    user_id = int(payload["sub"])
    with get_db() as conn:
        row = conn.execute("SELECT * FROM users WHERE id=? AND is_active=1", (user_id,)).fetchone()
    if not row:
        raise HTTPException(401, "User not found or inactive")
    return dict(row)


async def require_admin(user: dict = Depends(get_current_user)) -> dict:
    if user["role"] != "admin":
        raise HTTPException(403, "Admin access required")
    return user


# --- Routes ---

@router.post("/register")
def register(body: RegisterRequest):
    if len(body.username) < 3:
        raise HTTPException(400, "Username must be at least 3 characters")
    if len(body.password) < 6:
        raise HTTPException(400, "Password must be at least 6 characters")

    salt = secrets.token_hex(16)
    password_hash = _hash_password(body.password, salt)

    with get_db() as conn:
        # Check if first user → make admin
        count = conn.execute("SELECT COUNT(*) FROM users").fetchone()[0]
        role = "admin" if count == 0 else "user"

        try:
            cur = conn.execute(
                "INSERT INTO users (username, email, password_hash, salt, role, created_at) VALUES (?,?,?,?,?,?)",
                (body.username, body.email, password_hash, salt, role, now()),
            )
        except sqlite3.IntegrityError:
            raise HTTPException(409, "Username already exists")

        user_id = cur.lastrowid

    token = _create_token(user_id, body.username, role)
    return {"token": token, "user": {"id": user_id, "username": body.username, "role": role}}


@router.post("/login")
def login(body: LoginRequest):
    with get_db() as conn:
        row = conn.execute("SELECT * FROM users WHERE username=? AND is_active=1", (body.username,)).fetchone()

    if not row:
        raise HTTPException(401, "Invalid credentials")

    user = dict(row)
    password_hash = _hash_password(body.password, user["salt"])

    if password_hash != user["password_hash"]:
        raise HTTPException(401, "Invalid credentials")

    # Update last_login
    with get_db() as conn:
        conn.execute("UPDATE users SET last_login=? WHERE id=?", (now(), user["id"]))

    token = _create_token(user["id"], user["username"], user["role"])
    return {"token": token, "user": {"id": user["id"], "username": user["username"], "role": user["role"], "email": user["email"]}}


@router.get("/me")
def get_me(user: dict = Depends(get_current_user)):
    return {
        "id": user["id"],
        "username": user["username"],
        "email": user["email"],
        "role": user["role"],
        "created_at": user["created_at"],
        "last_login": user["last_login"],
    }
