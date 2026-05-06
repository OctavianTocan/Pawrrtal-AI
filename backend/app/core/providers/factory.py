"""Provider factory — resolves a model ID to an :class:`AIProvider`.

The factory layer is the only place that reads :mod:`app.core.config`,
keeping the providers themselves config-agnostic and trivially testable
by passing :class:`ClaudeProviderConfig` directly.
"""

from __future__ import annotations

from app.core.config import settings

from .base import AIProvider
from .claude_provider import ClaudeProvider, ClaudeProviderConfig
from .gemini_provider import GeminiProvider

_DEFAULT_MODEL = "gemini-2.5-flash-preview-05-20"

# Model ID prefixes that route to each provider.
_GEMINI_PREFIXES = ("gemini-",)
_CLAUDE_PREFIXES = ("claude-",)


def resolve_provider(model_id: str | None) -> AIProvider:
    """Return the correct :class:`AIProvider` for the given model ID.

    Routing:
      - ``claude-*``  → ClaudeProvider (Claude Agent SDK, native session resume)
      - ``gemini-*``  → GeminiProvider (google-genai SDK, manual history)
      - anything else → GeminiProvider with the supplied ID (pass-through)

    Args:
        model_id: Frontend model identifier, or ``None`` to use the default.

    Returns:
        A provider instance ready to ``stream()``.
    """
    resolved = (model_id or _DEFAULT_MODEL).strip()
    if any(resolved.startswith(p) for p in _CLAUDE_PREFIXES):
        config = ClaudeProviderConfig(
            oauth_token=settings.claude_code_oauth_token or None,
            enable_exa_search=bool(settings.exa_api_key),
        )
        return ClaudeProvider(resolved, config=config)
    return GeminiProvider(resolved)
