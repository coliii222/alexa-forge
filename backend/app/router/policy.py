from app.vault.service import active_keys_for_provider, get_secret
from app.providers.fake import FakeProvider
from app.providers.fal import FalProvider
from app.providers.magnific import MagnificProvider
from app.providers.runway import RunwayProvider
from app.providers.kling import KlingProvider

PROVIDERS = {
    "fake": FakeProvider(),
    "fal": FalProvider(),
    "magnific": MagnificProvider(),
    "runway": RunwayProvider(),
    "kling": KlingProvider(),
}


def choose_provider_key(provider: str | None = None, user_id: int = None):
    provider = provider or "fake"
    if provider not in PROVIDERS:
        raise ValueError(f"Unknown provider: {provider}")
    keys = active_keys_for_provider(provider, user_id)
    if not keys:
        raise ValueError(f"No active key for provider: {provider}. Add one in API Vault.")
    key_row = keys[0]
    return PROVIDERS[provider], key_row, get_secret(key_row)
