"""Application settings."""

from pathlib import Path
from urllib.parse import urlparse

from pydantic_settings import BaseSettings, SettingsConfigDict

DEFAULT_SQLITE_ASYNC_URL = "sqlite+aiosqlite:///./nexus.db"
DEFAULT_SQLITE_SYNC_URL = "sqlite:///./nexus.db"


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=Path(__file__).resolve().parents[2] / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    database_url: str = ""
    auth_secret: str
    env: str = "dev"
    google_api_key: str
    fernet_key: str
    cors_origins: list[str]
    cors_origin_regex: str | None = r"^https:\/\/.*\.vercel\.app$"
    cookie_domain: str
    registration_secret: str = ""
    workspace_base_dir: str = "/data/workspaces"
    admin_email: str | None = None
    admin_password: str | None = None

    @property
    def is_production(self) -> bool:
        """Whether the app is running in production mode."""
        return self.env == "prod"

    @property
    def _normalized_database_url(self) -> str:
        """Return the configured database URL in a normalized form."""
        url = self.database_url.strip()
        if not url:
            return DEFAULT_SQLITE_SYNC_URL

        parsed = urlparse(url)
        if parsed.scheme.startswith(("postgresql", "sqlite")):
            return url

        if url.endswith(".db") or "/" in url or url.startswith("."):
            return f"sqlite:///{url}"

        return url

    @property
    def is_sqlite(self) -> bool:
        """Whether the configured database uses SQLite."""
        return urlparse(self._normalized_database_url).scheme.startswith("sqlite")

    @property
    def db_url_sync(self) -> str:
        """Return the sync database URL."""
        if not self.database_url.strip():
            return DEFAULT_SQLITE_SYNC_URL

        url = self._normalized_database_url
        if url.startswith("postgresql+psycopg://"):
            return url.replace("postgresql+psycopg://", "postgresql://", 1)
        if url.startswith("sqlite+aiosqlite://"):
            return url.replace("sqlite+aiosqlite://", "sqlite://", 1)
        return url

    @property
    def db_url_async(self) -> str:
        """Return the async database URL."""
        if not self.database_url.strip():
            return DEFAULT_SQLITE_ASYNC_URL

        url = self._normalized_database_url
        if url.startswith("postgresql://"):
            return url.replace("postgresql://", "postgresql+psycopg://", 1)
        if url.startswith("sqlite://") and not url.startswith("sqlite+aiosqlite://"):
            return url.replace("sqlite://", "sqlite+aiosqlite://", 1)
        return url


settings = Settings()  # type: ignore[call-arg]
