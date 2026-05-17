from app.vault.service import active_keys, get_secret
from app.providers.fake import FakeProvider
from app.providers.fal import FalProvider

PROVIDERS={"fake": FakeProvider(), "fal": FalProvider()}

def choose_provider_key(provider: str | None = None):
    provider = provider or 'fake'
    keys = active_keys(provider)
    if not keys: raise ValueError(f'No active key for provider: {provider}')
    return PROVIDERS[provider], keys[0], get_secret(keys[0])
