from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql://journeo:journeo_dev@localhost:5432/journeo"
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
    cors_allowed_origins: str = "*"
    aws_endpoint_url: str = ""
    aws_region: str = "us-east-1"
    aws_access_key_id: str = "test"
    aws_secret_access_key: str = "test"
    s3_bucket: str = "journey-files"
    s3_public_endpoint: str = "http://localhost:4566/journey-files"
    s3_presign_expiry_seconds: int = 600
    s3_max_image_mb: int = 25
    s3_max_video_mb: int = 200
    seed_on_start: bool = False
    seed_reset: bool = False
    demo_data_seed: bool = False
    demo_data_reset: bool = False
    class Config:
        env_file = ".env"
        extra = "allow"
settings = Settings()
