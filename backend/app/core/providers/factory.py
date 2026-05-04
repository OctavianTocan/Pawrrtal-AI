"""Provider factory — resolves a model ID to an :class:`AIProvider`.

The factory layer is the only place that reads :mod:`app.core.config`,
keeping the providers themselves config-agnostic and trivially testable
by passing :class:`ClaudeProviderConfig` directly.
"""

from __future__ import annotations

from app.core.config import settings

from .agno_provider import AgnoProvider
from .base import AIProvider
from .claude_provider import ClaudeProvider, ClaudeProviderConfig

_DEFAULT_MODEL = "gemini-3-flash-preview"


def resolve_provider(model_id: str | None) -> AIProvider:
    """Return the correct :class:`AIProvider` for the given model ID.

    All model IDs starting with ``claude-`` route to :class:`ClaudeProvider`.
    Everything else routes to :class:`AgnoProvider` (Gemini and other
    Agno-supported models).

    Args:
        model_id: Frontend model identifier, or ``None`` to use the default.

    Returns:
        A provider instance ready to ``stream()``.
    """
    resolved = (model_id or _DEFAULT_MODEL).strip()
    if resolved.startswith("claude-"):
        config = ClaudeProviderConfig(
            oauth_token=settings.claude_code_oauth_token or None,
        )
        return ClaudeProvider(resolved, config=config)
    return AgnoProvider(resolved)
