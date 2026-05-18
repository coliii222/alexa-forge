from app.vault.service import active_keys_for_provider, get_secret
from app.providers.fake import FakeProvider
from app.providers.fal import FalProvider

PROVIDERS = {"fake": FakeProvider(), "fal": FalProvider()}


def choose_provider_key(provider: str | None = None):
    provider = provider or "fake"
    if provider not in PROVIDERS:
        raise ValueError(f"Unknown provider: {provider}")
    keys = active_keys_for_provider(provider)
    if not keys:
        raise ValueError(f"No active key for provider: {provider}")
    key_row = keys[0]
    return PROVIDERS[provider], key_row, get_secret(key_row)
