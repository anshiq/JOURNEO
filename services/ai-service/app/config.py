from pydantic_settings import BaseSettings
class Settings(BaseSettings):
    database_url: str = "postgresql://journeo:journeo_dev@localhost:5432/ai_db"
    analytics_service_url: str = "http://localhost:8082"
    connectors_service_url: str = "http://localhost:8083"
    journey_service_url: str = "http://localhost:8081"
    openrouter_api_key: str = ""
    openrouter_model: str = "google/gemma-4-31b-it:free"
    openrouter_fallback_model: str = "nvidia/nemotron-3-super-120b-a12b:free"
    openrouter_base_url: str = "https://openrouter.ai/api/v1"
    guardrail_mode: str = "flag"
    anomaly_scan_interval_minutes: int = 15
    internal_service_token: str = "journeo-internal-token-dev"
    self_ping_url: str = ""
    self_ping_enabled: bool = True
    self_ping_interval_minutes: int = 4
    class Config:
        env_file = ".env"
        extra = "allow"
settings = Settings()
