from abc import ABC, abstractmethod
class AdPlatformConnector(ABC):
    @abstractmethod
    async def create_campaign(self, payload: dict): pass
    @abstractmethod
    async def pause_campaign(self, campaign_id: str): pass
    @abstractmethod
    async def reallocate_budget(self, payload: dict): pass
