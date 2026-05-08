"""Provider factory — resolves a model ID to an :class:`AILLM`.

The factory layer is the only place that reads :mod:`app.core.config`,
keeping the providers themselves config-agnostic and trivially testable
by passing :class:`ClaudeLLMConfig` directly.
"""

from __future__ import annotations

from app.core.config import settings

from .base import AILLM
from .claude_provider import ClaudeLLM, ClaudeLLMConfig
from .gemini_provider import GeminiLLM

_DEFAULT_MODEL = "gemini-2.5-flash-preview-05-20"

# Model ID prefixes that route to each provider.
_GEMINI_PREFIXES = ("gemini-",)
_CLAUDE_PREFIXES = ("claude-",)


def resolve_llm(model_id: str | None) -> AILLM:
    """Return the correct :class:`AILLM` for the given model ID.

    Routing:
      - ``claude-*``  → ClaudeLLM (Claude Agent SDK, native session resume)
      - ``gemini-*``  → GeminiLLM (google-genai SDK, manual history)
      - anything else → GeminiLLM with the supplied ID (pass-through)

    Args:
        model_id: Frontend model identifier, or ``None`` to use the default.

    Returns:
        A provider instance ready to ``stream()``.
    """
    resolved = (model_id or _DEFAULT_MODEL).strip()
    if any(resolved.startswith(p) for p in _CLAUDE_PREFIXES):
        config = ClaudeLLMConfig(
            oauth_token=settings.claude_code_oauth_token or None,
        )
        return ClaudeLLM(resolved, config=config)
    return GeminiLLM(resolved)
