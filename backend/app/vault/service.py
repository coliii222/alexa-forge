from app.database import list_keys, create_key as db_create_key, active_keys as db_active_keys, increment_key_success, delete_key, toggle_key
from app.vault.crypto import encrypt_secret, decrypt_secret, preview_secret


def serialize_key(row: dict) -> dict:
    secret = decrypt_secret(row["secret_encrypted"])
    out = {k: v for k, v in row.items() if k != "secret_encrypted"}
    out["secret_preview"] = preview_secret(secret)
    out["is_active"] = bool(out.get("is_active"))
    out["is_limited"] = bool(out.get("is_limited"))
    return out


def create_key(user_id: int, provider: str, label: str, secret: str, priority: int = 0) -> dict:
    row = db_create_key(user_id, provider, label, encrypt_secret(secret), priority)
    return serialize_key(row)


def list_keys_serialized(user_id: int = None) -> list[dict]:
    return [serialize_key(k) for k in list_keys(user_id)]


def active_keys_for_provider(provider: str | None = None, user_id: int = None) -> list[dict]:
    return db_active_keys(provider, user_id)


def get_secret(row: dict) -> str:
    return decrypt_secret(row["secret_encrypted"])


def remove_key(key_id: int, user_id: int) -> bool:
    return delete_key(key_id, user_id)


def set_key_active(key_id: int, user_id: int, active: bool) -> bool:
    return toggle_key(key_id, user_id, active)
