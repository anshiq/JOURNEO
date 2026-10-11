from app.modules.ai.models import AiGenerationJob
from app.modules.assistant.models import DocumentChunk, KnowledgeSource
from app.modules.campaigns.models import Campaign, CampaignSlug
from app.modules.journeys.models import Journey, JourneyCheckpoint, JourneyVersion, UserTemplate
from app.modules.leads.models import Lead, WebhookDelivery
from app.modules.media.models import File
from app.modules.runtime.models import JourneyEvent, JourneySession

MODELS = (
    AiGenerationJob,
    Campaign,
    CampaignSlug,
    DocumentChunk,
    File,
    Journey,
    JourneyCheckpoint,
    JourneyEvent,
    JourneySession,
    JourneyVersion,
    KnowledgeSource,
    Lead,
    UserTemplate,
    WebhookDelivery,
)
