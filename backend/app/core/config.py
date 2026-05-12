"""Application settings."""

from pathlib import Path
from typing import Literal
from urllib.parse import urlparse

from pydantic import field_validator, model_validator
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
    # Encryption key for per-user workspace .env files.
    # Generate with: python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
    workspace_encryption_key: str
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
    # The base directory where workspaces will be stored. Each workspace can contain files, configurations, and other resources specific to a user's project or environment.
    workspace_base_dir: str = "/data/workspaces"

    # ── Agent loop safety ────────────────────────────────────────────────
    # See backend/app/core/agent_loop/types.py::AgentSafetyConfig for the
    # behavioural contract.  All four caps accept None to opt out of the
    # specific guard (set the matching env var to an empty string in
    # ``.env`` and Pydantic will coerce to None — or pass --None).

    # Hard cap on assistant turns per chat invocation.  Default 25 covers
    # multi-step refactors and deep research; runaway tool loops trip
    # well before this.  Set 0/empty to disable.
    agent_max_iterations: int | None = 25

    # Wall-clock budget (seconds) for one chat invocation.  Counted from
    # entry to ``agent_loop``.  Default 300 (5 min); raise for long-
    # running automations.
    agent_max_wall_clock_seconds: float | None = 300.0

    # Back-to-back stream errors before the loop bails.  Resets on any
    # successful stream.  Default 3 — covers transient provider blips
    # while still bailing out of a real outage quickly.
    agent_max_consecutive_llm_errors: int | None = 3

    # Back-to-back tool failures before the loop bails.  Resets on any
    # successful tool call.  Default 5.
    agent_max_consecutive_tool_errors: int | None = 5

    # Base backoff (seconds) between LLM retries; doubles each retry,
    # capped at 30s inside the loop.  Set 0 for instant retry.
    agent_llm_retry_backoff_seconds: float = 1.0
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
    google_oauth_redirect_uri: str = (
        "http://localhost:8000/api/v1/auth/oauth/google/callback"
    )

    # --- OAuth: Apple ---
    # Apple Sign In requires four pieces: services ID (acts as client_id),
    # team ID, key ID, and the .p8 private key contents. Set all four to
    # enable the "Continue with Apple" button.
    apple_oauth_client_id: str = ""
    apple_oauth_team_id: str = ""
    apple_oauth_key_id: str = ""
    apple_oauth_private_key: str = ""
    apple_oauth_redirect_uri: str = (
        "http://localhost:8000/api/v1/auth/oauth/apple/callback"
    )

    # Where to send the user after a successful OAuth sign-in. Override in
    # production to point at the deployed frontend (e.g. https://app/...).
    oauth_post_login_redirect: str = "http://localhost:3001/"

    # --- Channels: Telegram --------------------------------------------------
    # Bot token issued by @BotFather. Leaving this empty disables the
    # whole Telegram channel — the link/unbind routes report "not
    # configured" and the bot adapter never starts. Use a separate dev
    # bot for local work so a busted handler can't spam real users.
    telegram_bot_token: str = ""
    # Username of the bot the token belongs to (without the leading @).
    # Surfaced in the link-code response so the frontend can render a
    # `https://t.me/<bot>?start=<code>` deep link without hard-coding.
    telegram_bot_username: str = ""
    # How the bot receives updates. "polling" works everywhere (no public
    # URL needed) and is the default so local dev just works. "webhook"
    # is the prod path and requires `telegram_webhook_url`.
    telegram_mode: Literal["polling", "webhook"] = "polling"
    # Public HTTPS URL Telegram should POST updates to when running in
    # webhook mode. Ignored in polling mode.
    telegram_webhook_url: str = ""
    # Optional shared secret Telegram sends in the
    # `X-Telegram-Bot-Api-Secret-Token` header on every webhook delivery
    # so the receiving FastAPI route can drop forgeries.
    telegram_webhook_secret: str = ""

    # Comma-separated email allowlist enforced by ``get_allowed_user`` on
    # every protected route.  Empty (the default) leaves the deployment
    # open to any authenticated user — fine for local dev, never deploy
    # publicly without setting this.  Compare case-insensitive.
    allowed_emails: str = ""

    @property
    def allowed_emails_set(self) -> frozenset[str]:
        """Parsed, lowercased view of ``allowed_emails`` for membership tests."""
        if not self.allowed_emails:
            return frozenset()
        return frozenset(
            addr.strip().lower()
            for addr in self.allowed_emails.split(",")
            if addr.strip()
        )

    # Per-user chat rate limit (requests per 60-second rolling window).
    # Zero disables the limit entirely — useful for local dev.  Production
    # deployments should pick a value that matches the operator's monthly
    # token budget divided by expected request count.
    chat_rate_limit_per_minute: int = 0

    @field_validator("telegram_bot_username", mode="before")
    @classmethod
    def _strip_telegram_at_prefix(cls, value: object) -> object:
        """Forgive a leading ``@`` in ``TELEGRAM_BOT_USERNAME``.

        Telegram deep links are ``https://t.me/<username>``; an ``@``
        produces ``t.me/@username`` which Telegram redirects to its
        homepage instead of the bot. Humans frequently paste the
        ``@``-prefixed handle into ``.env``, so we normalize once at the
        config boundary instead of forcing every consumer to remember.
        """
        if isinstance(value, str):
            return value.lstrip("@")
        return value

    @model_validator(mode="after")
    def validate_secure_cookie(self) -> "Settings":
        """Reject misconfigurations where ``SameSite=none`` is paired with insecure cookies."""
        secure = (
            self.cookie_secure if self.cookie_secure is not None else self.is_production
        )
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
