from pydantic_settings import BaseSettings
class Settings(BaseSettings):
    database_url: str = "postgresql://journeo:journeo_dev@localhost:5432/ai_db"
    analytics_service_url: str = "http://localhost:8082"
    connectors_service_url: str = "http://localhost:8083"
    journey_service_url: str = "http://localhost:8081"
    openrouter_api_key: str = ""
    openrouter_model: str = "google/gemma-4-31b-it:free"
    openrouter_fallback_model: str = "nvidia/nemotron-3-super-120b-a12b:free"
    openrouter_vision_model: str = "google/gemini-2.0-flash-exp:free"
    openrouter_base_url: str = "https://openrouter.ai/api/v1"
    guardrail_mode: str = "flag"
    anomaly_scan_interval_minutes: int = 15
    internal_service_token: str = "journeo-internal-token-dev"
    keepalive_urls: str = ""
    keepalive_enabled: bool = True
    keepalive_interval_minutes: int = 5
    class Config:
        env_file = ".env"
        extra = "allow"
settings = Settings()
