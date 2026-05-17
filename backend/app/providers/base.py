from dataclasses import dataclass

@dataclass
class ProviderResult:
    provider_task_id: str
    output_url: str
    metadata: dict

class CreativeProvider:
    name: str
    async def submit(self, payload: dict, api_key: str) -> ProviderResult: raise NotImplementedError
