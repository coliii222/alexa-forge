from cryptography.fernet import Fernet
import base64, hashlib
from app.config import settings

def _fernet():
    key = base64.urlsafe_b64encode(hashlib.sha256(settings.vault_secret.encode()).digest())
    return Fernet(key)

def encrypt_secret(secret: str) -> str:
    return _fernet().encrypt(secret.encode()).decode()

def decrypt_secret(token: str) -> str:
    return _fernet().decrypt(token.encode()).decode()

def preview_secret(secret: str) -> str:
    if len(secret) <= 6: return "***"
    return f"{secret[:3]}...{secret[-4:]}"
