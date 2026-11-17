"""All runtime settings, read from environment variables (prefix SOSUV_) or a .env file.

Nothing else in the codebase reads os.environ directly: ask for `get_settings()` instead.
"""

from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic import SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="SOSUV_", env_file=".env", extra="ignore")

    env: Literal["dev", "test", "prod"] = "dev"
    log_level: str = "INFO"
    log_json: bool = True

    # Database
    database_url: str = "postgresql+asyncpg://sosuv:sosuv@localhost:5432/sosuv"
    db_pool_size: int = 10
    db_max_overflow: int = 10

    # API
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    cors_origins: list[str] = ["http://localhost:5173"]

    # Security: Fernet key used to encrypt secrets (passwords, connection strings) at rest.
    encryption_key: SecretStr | None = None

    # File storage for files passed between nodes (local disk now, S3 later).
    storage_root: Path = Path("./data/files")

    # Scheduler
    scheduler_tick_seconds: float = 10.0

    # Workers
    worker_concurrency: int = 4
    worker_queues: list[str] = ["default"]
    worker_poll_seconds: float = 1.0
    worker_heartbeat_seconds: float = 5.0
    # A running task whose heartbeat is older than this is treated as abandoned and re-queued.
    task_lease_seconds: int = 60
    default_task_timeout_seconds: int = 3600
    # Node outputs bigger than this must be stored as files (FileRef), not JSON.
    max_output_bytes: int = 256 * 1024

    @property
    def is_prod(self) -> bool:
        return self.env == "prod"


@lru_cache
def get_settings() -> Settings:
    return Settings()
