"""
Application settings.
"""

from pathlib import Path

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

    # The URL for the database connection. By default, it uses SQLite with a file named "agno.db" in the current directory.
    db_url: str = "sqlite+aiosqlite:///./agno.db"
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
    # The domain to set for cookies (e.g., "example.com"). This is important for authentication cookies to work correctly across subdomains.
    cookie_domain: str
    # Optional secret required to register a new account. When set, anyone
    # attempting to register must supply this value as ``invite_code`` in the
    # request body. Leave unset (or empty) to allow open registration.
    registration_secret: str = ""

    @property
    def is_production(self) -> bool:
        """
        A convenience property that returns True if the application is running in production mode (i.e., if env is set to "prod").
        """
        return self.env == "prod"


settings = Settings()  # type: ignore[call-arg]
