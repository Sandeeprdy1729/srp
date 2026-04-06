"""
AarogyaKosha - Core Configuration
100% Open Source Configuration Module
"""

from functools import lru_cache
from pathlib import Path
from typing import List, Optional

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", case_sensitive=False
    )

    # Application
    app_name: str = "AarogyaKosha"
    app_version: str = "1.0.0"
    debug: bool = False
    host: str = "0.0.0.0"

    @field_validator("debug", mode="before")
    @classmethod
    def parse_debug(cls, v):
        if isinstance(v, bool):
            return v
        if isinstance(v, str):
            return v.lower() in ("true", "1", "yes")
        return False
    port: int = 8000

    # Database
    database_url: str = (
        "postgresql+asyncpg://postgres:postgres@localhost:5432/aarogyakosha"
    )

    # Redis
    redis_url: str = "redis://localhost:6379/0"

    # Security
    secret_key: str = "change-me-in-production"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 7
    algorithm: str = "HS256"

    # MinIO
    minio_endpoint: str = "localhost:9000"
    minio_access_key: str = "minioadmin"
    minio_secret_key: str = "minioadmin"
    minio_bucket: str = "aarogyakosha"
    minio_secure: bool = False

    # HAPI FHIR
    hapi_fhir_url: str = "http://localhost:8080/fhir"

    # Meilisearch
    meilisearch_host: str = "http://localhost:7700"
    meilisearch_api_key: str = "masterKey"

    # NLP
    nlp_model_name: str = "dmis-lab/biobert-base-cased-v1.2"
    nlp_model_cache: str = "/tmp/nlp_models"

    # CORS
    cors_origins: str = "http://localhost:5173,http://localhost:3000"

    # File Upload
    max_file_size_mb: int = 50
    upload_dir: str = "/tmp/aarogyakosha/uploads"

    # Logging
    log_level: str = "INFO"

    @property
    def cors_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.cors_origins.split(",")]

    @property
    def upload_max_bytes(self) -> int:
        return self.max_file_size_mb * 1024 * 1024


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
