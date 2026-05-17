import uuid, asyncio
from app.providers.base import CreativeProvider, ProviderResult

class FakeProvider(CreativeProvider):
    name='fake'
    async def submit(self, payload: dict, api_key: str) -> ProviderResult:
        await asyncio.sleep(0.01)
        tid = 'fake_' + uuid.uuid4().hex[:12]
        return ProviderResult(provider_task_id=tid, output_url=f'https://cdn.alexa-forge.local/{tid}.mp4', metadata={"mock": True, "prompt": payload.get('prompt','')})
