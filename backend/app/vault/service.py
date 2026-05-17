from app.store import KEYS, next_key_id, now
from app.vault.crypto import encrypt_secret, decrypt_secret, preview_secret

def serialize_key(row):
    secret = decrypt_secret(row["secret_encrypted"])
    return {k:v for k,v in row.items() if k != "secret_encrypted"} | {"secret_preview": preview_secret(secret)}

def create_key(provider, label, secret, priority=0):
    row={"id":next_key_id(),"provider":provider,"label":label,"secret_encrypted":encrypt_secret(secret),"priority":priority,"is_active":True,"is_limited":False,"cooldown_until":None,"success_count":0,"error_count":0,"created_at":now()}
    KEYS.append(row); return serialize_key(row)

def list_keys(): return [serialize_key(k) for k in KEYS]
def active_keys(provider=None):
    rows=[k for k in KEYS if k["is_active"] and not k["is_limited"]]
    if provider: rows=[k for k in rows if k["provider"]==provider]
    return sorted(rows, key=lambda k:k.get("priority",0), reverse=True)
def get_secret(row): return decrypt_secret(row["secret_encrypted"])
