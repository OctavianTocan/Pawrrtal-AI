"""
Application settings.
"""

from pathlib import Path
from typing import Literal

from typing import Any, Literal
from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Application settings. This class uses Pydantic's BaseSettings to automatically read environment variables and provide type validation.
    """

    # Load environment variables from a .env file in the current directory, with UTF-8 encoding. This allows you to define your settings in a .env file instead of setting them directly in the environment.
    model_config = SettingsConfigDict(
        env_file=Path(__file__).resolve().parents[2] / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # The URL for the database connection.
    database_url: str = ""
    # The secret key used for signing authentication tokens. This should be set to a secure random value in production.
    auth_secret: str
    # The environment in which the application is running. Can be "dev" for development or "prod" for production.
    env: str = "dev"
    # The API key for Google services.
    google_api_key: str
    # Fernet Encryption Key (used to encrypt API keys)
    fernet_key: str
    # CORS
    cors_origins: list[str]
    cors_origin_regex: str | None = r"^https:\/\/.*\.vercel\.app$"
    # The domain to set for cookies (e.g., "example.com"). This is important for authentication cookies to work correctly across subdomains.
    cookie_domain: str | None = None
    # Controls cross-site cookie behavior ("lax", "strict", "none"). Set to "none" (with secure=True) to allow auth across completely different domains (like Vercel previews).
    cookie_samesite: Literal["lax", "strict", "none"] = "lax"
    # Optional secret required to register a new account. When set, anyone
    # attempting to register must supply this value as ``invite_code`` in the
    # request body. Leave unset (or empty) to allow open registration.
    registration_secret: str = ""
    # The base directory where workspaces will be stored. Each workspace can contain files, configurations, and other resources specific to a user's project or environment.
    workspace_base_dir: str = "/data/workspaces"
    # Admin user credentials (for testing).
    admin_email: str | None = None
    admin_password: str | None = None

    @model_validator(mode="after")
    def validate_secure_cookie(self) -> "Settings":
        if self.cookie_samesite == "none" and not self.is_production:
            raise ValueError("cookie_samesite='none' requires HTTPS (which is tied to is_production in this template).")
        return self

    @property
    def is_production(self) -> bool:
        """
        A convenience property that returns True if the application is running in production mode (i.e., if env is set to "prod").
        """
        return self.env == "prod"

    @property
    def db_url_sync(self) -> str:
        """
        Returns the database URL formatted for synchronous connections. If the original database URL starts with "postgresql+psycopg://", it replaces it with "postgresql://" to ensure compatibility with sync database drivers.
        """
        return self.db_url_async

    @property
    def db_url_async(self) -> str:
        """
        Returns the database URL formatted for asynchronous connections. If the original database URL starts with "postgresql://", it replaces it with "postgresql+psycopg://" to ensure compatibility with async database drivers.
        """
        url = self.database_url
        if url.startswith("postgresql://"):
            url = url.replace("postgresql://", "postgresql+psycopg://")
        return url


settings = Settings()  # type: ignore[call-arg]
