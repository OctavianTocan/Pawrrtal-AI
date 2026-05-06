"""Application settings."""

from pathlib import Path
from typing import Literal
from urllib.parse import urlparse

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings. This class uses Pydantic's BaseSettings to automatically read environment variables and provide type validation."""

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
    # OAuth token used by the Claude Agent SDK to authenticate the bundled
    # Claude Code CLI subprocess. Optional — only required when a chat
    # request resolves to a Claude model. Generate with `claude setup-token`.
    claude_code_oauth_token: str = ""
    # API key for Exa (https://exa.ai). Powers the provider-agnostic
    # `exa_search` tool wired into both the Claude SDK and Agno agents.
    # Leave empty to disable web search; the tool returns a clear
    # "not configured" error rather than crashing the turn.
    exa_api_key: str = ""
    # API key for xAI (https://x.ai). Powers the speech-to-text proxy
    # endpoint at POST /api/v1/stt — the frontend records audio with the
    # browser's MediaRecorder, uploads the blob, and the backend forwards
    # it to https://api.x.ai/v1/stt. Leave empty to disable voice input
    # (the endpoint returns 503 with a clear "not configured" message).
    xai_api_key: str = ""
    # CORS
    cors_origins: list[str]
    cors_origin_regex: str | None = r"^https:\/\/.*\.vercel\.app$"
    # The domain to set for cookies (e.g., "example.com"). This is important for authentication cookies to work correctly across subdomains.
    cookie_domain: str | None = None
    # Controls cross-site cookie behavior ("lax", "strict", "none"). Set to "none" (with secure=True) to allow auth across completely different domains (like Vercel previews).
    cookie_samesite: Literal["lax", "strict", "none"] = "lax"
    # If True, forces the Secure flag on cookies. If False, forces HTTP allowed. If None, auto-detects based on is_production.
    cookie_secure: bool | None = None
    # Optional secret required to register a new account. When set, anyone
    # attempting to register must supply this value as ``invite_code`` in the
    # request body. Leave unset (or empty) to allow open registration.
    registration_secret: str = ""
    # The base directory where workspaces will be stored. Each workspace can contain files, configurations, and other resources specific to a user's project or environment.
    workspace_base_dir: str = "/data/workspaces"
    # Admin user credentials (for testing).
    admin_email: str | None = None
    admin_password: str | None = None

    # --- OAuth: Google ---
    # Set both to enable the "Continue with Google" button on the login
    # page. When either is empty the start endpoint returns 503 with a
    # clear "not configured" message. Get these from the Google Cloud
    # Console: https://console.cloud.google.com/apis/credentials
    google_oauth_client_id: str = ""
    google_oauth_client_secret: str = ""
    # Where Google redirects back to after auth. Must be an authorized
    # redirect URI on the OAuth client. Default targets local dev.
    google_oauth_redirect_uri: str = "http://localhost:8000/api/v1/auth/oauth/google/callback"

    # --- OAuth: Apple ---
    # Apple Sign In requires four pieces: services ID (acts as client_id),
    # team ID, key ID, and the .p8 private key contents. Set all four to
    # enable the "Continue with Apple" button.
    apple_oauth_client_id: str = ""
    apple_oauth_team_id: str = ""
    apple_oauth_key_id: str = ""
    apple_oauth_private_key: str = ""
    apple_oauth_redirect_uri: str = "http://localhost:8000/api/v1/auth/oauth/apple/callback"

    # Where to send the user after a successful OAuth sign-in. Override in
    # production to point at the deployed frontend (e.g. https://app/...).
    oauth_post_login_redirect: str = "http://localhost:3001/"

    @model_validator(mode="after")
    def validate_secure_cookie(self) -> "Settings":
        """Reject misconfigurations where ``SameSite=none`` is paired with insecure cookies."""
        secure = self.cookie_secure if self.cookie_secure is not None else self.is_production
        if self.cookie_samesite == "none" and not secure:
            raise ValueError(
                "cookie_samesite='none' requires HTTPS (cookie_secure must be True, or run with ENV=prod)."
            )
        return self

    @property
    def is_production(self) -> bool:
        """A convenience property that returns True if the application is running in production mode (i.e., if env is set to "prod")."""
        return self.env == "prod"

    @property
    def _normalized_database_url(self) -> str:
        """Return the configured database URL in a normalized form."""
        url = self.database_url.strip()
        if not url:
            return "sqlite:///./nexus.db"

        parsed = urlparse(url)
        if parsed.scheme.startswith(("postgresql", "sqlite")):
            return url

        # Treat bare filesystem paths as SQLite database files.
        if not parsed.scheme:
            return f"sqlite:///{url}"

        return url

    @property
    def is_sqlite(self) -> bool:
        """Whether the configured database uses SQLite."""
        return urlparse(self._normalized_database_url).scheme.startswith("sqlite")

    @property
    def db_url_sync(self) -> str:
        """Return the database URL formatted for synchronous connections.

        PostgreSQL URLs are normalized to the installed psycopg driver, while
        SQLite async URLs are converted back to the sync sqlite dialect.
        """
        url = self._normalized_database_url
        if url.startswith("postgresql://"):
            return url.replace("postgresql://", "postgresql+psycopg://", 1)
        if url.startswith("sqlite+aiosqlite://"):
            return url.replace("sqlite+aiosqlite://", "sqlite://", 1)
        return url

    @property
    def db_url_async(self) -> str:
        """Return the database URL formatted for asynchronous connections.

        PostgreSQL URLs are normalized to the psycopg async dialect and SQLite
        sync URLs are converted to the aiosqlite dialect.
        """
        url = self._normalized_database_url
        if url.startswith("postgresql://"):
            return url.replace("postgresql://", "postgresql+psycopg://", 1)
        if url.startswith("sqlite://") and not url.startswith("sqlite+aiosqlite://"):
            return url.replace("sqlite://", "sqlite+aiosqlite://", 1)
        return url


settings = Settings()  # type: ignore[call-arg]
