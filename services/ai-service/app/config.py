from pydantic_settings import BaseSettings
class Settings(BaseSettings):
    database_url: str = "postgresql://journeo:journeo_dev@localhost:5432/ai_db"
    analytics_service_url: str = "http://localhost:8082"
    connectors_service_url: str = "http://localhost:8083"
    journey_service_url: str = "http://localhost:8081"
    openrouter_api_key: str = ""
    openrouter_model: str = "anthropic/claude-3.5-sonnet"
    openrouter_base_url: str = "https://openrouter.ai/api/v1"
    guardrail_mode: str = "flag"
    anomaly_scan_interval_minutes: int = 15
    internal_service_token: str = "journeo-internal-token-dev"
    class Config:
        env_file = ".env"
        extra = "allow"
settings = Settings()
