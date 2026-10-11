from functools import lru_cache
from typing import Literal

from pydantic import BaseModel, Field, PostgresDsn, SecretStr, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class WorkerSettings(BaseModel):
    mode: Literal["inprocess", "external", "off"] = "inprocess"
    concurrency: int = 4
    queues: list[str] = ["default", "ai", "ingest", "webhooks"]


class LlmSettings(BaseModel):
    mode: Literal["live", "mock", "off"] = "live"
    api_key: SecretStr = SecretStr("")
    base_url: str = "https://openrouter.ai/api/v1"
    model: str = "google/gemma-4-31b-it:free"
    generation_model: str | None = None
    vision_model: str | None = None
    timeout_s: float = 25.0

    @property
    def configured(self) -> bool:
        return self.mode == "mock" or (self.mode == "live" and bool(self.api_key.get_secret_value()))

    @property
    def generation(self) -> str:
        return self.generation_model or self.model


class StorageSettings(BaseModel):
    driver: Literal["auto", "db", "s3"] = "auto"
    s3_bucket: str | None = None
    s3_endpoint_url: str | None = None
    s3_public_base_url: str | None = None
    s3_region: str | None = None
    max_image_mb: int = 15
    max_video_mb: int = 200

    @property
    def resolved_driver(self) -> Literal["db", "s3"]:
        if self.driver == "auto":
            return "s3" if self.s3_bucket else "db"
        return self.driver


class KeepaliveSettings(BaseModel):
    enabled: bool = False
    urls: list[str] = []
    interval_s: int = 300


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_nested_delimiter="__", env_file=".env", extra="ignore")
    service: str = "api"
    log_level: str = "INFO"
    sentry_dsn: str | None = None
    database_url: PostgresDsn = Field(default=PostgresDsn("postgresql://journeo:journeo_dev@localhost:5437/journeo"))
    frontend_origin: str = "http://localhost:5173"
    public_base_url: str = "http://localhost:5173"
    cors_origins: list[str] = []
    editor_token: SecretStr | None = None
    rate_limit_enabled: bool = True
    rate_limit_storage_uri: str = "async+memory://"
    e2e: bool = False
    seed_on_start: bool = False
    contracts_dir: str = "contracts"
    unsplash_access_key: SecretStr | None = None
    worker: WorkerSettings = WorkerSettings()
    llm: LlmSettings = LlmSettings()
    storage: StorageSettings = StorageSettings()
    keepalive: KeepaliveSettings = KeepaliveSettings()
    openrouter_api_key: SecretStr | None = None
    openrouter_base_url: str | None = None
    openrouter_model: str | None = None
    openrouter_generation_model: str | None = None
    openrouter_vision_model: str | None = None

    @model_validator(mode="after")
    def apply_legacy_llm_names(self) -> "Settings":
        updates: dict[str, object] = {}
        defaults = LlmSettings()
        if self.openrouter_api_key and not self.llm.api_key.get_secret_value():
            updates["api_key"] = self.openrouter_api_key
        if self.openrouter_base_url and self.llm.base_url == defaults.base_url:
            updates["base_url"] = self.openrouter_base_url
        if self.openrouter_model and self.llm.model == defaults.model:
            updates["model"] = self.openrouter_model
        if self.openrouter_generation_model and not self.llm.generation_model:
            updates["generation_model"] = self.openrouter_generation_model
        if self.openrouter_vision_model and not self.llm.vision_model:
            updates["vision_model"] = self.openrouter_vision_model
        if updates:
            self.llm = self.llm.model_copy(update=updates)
        if self.rate_limit_storage_uri == "memory://":
            self.rate_limit_storage_uri = "async+memory://"
        return self

    @property
    def database_dsn(self) -> str:
        return str(self.database_url)


@lru_cache
def get_settings() -> Settings:
    return Settings()
