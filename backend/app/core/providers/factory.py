"""Provider factory — resolves a model ID to an :class:`AILLM`.

The factory layer is the only place that reads :mod:`app.core.config`,
keeping the providers themselves config-agnostic and trivially testable
by passing :class:`ClaudeLLMConfig` directly.
"""

from __future__ import annotations

import uuid

from app.core.config import settings

from .base import AILLM
from .claude_provider import ClaudeLLM, ClaudeLLMConfig
from .gemini_provider import GeminiLLM

_DEFAULT_MODEL = "gemini-2.5-flash-preview-05-20"

# Model ID prefixes that route to each provider.
_GEMINI_PREFIXES = ("gemini-",)
_CLAUDE_PREFIXES = ("claude-",)

# Provider segments callers may prepend to a model ID (``"<provider>/<model>"``).
# The Telegram channel and other surfaces use this shape to disambiguate
# providers in user-facing copy; the underlying SDKs reject it.  We strip
# the segment here so both ``"google/gemini-3-flash-preview"`` and the
# bare ``"gemini-3-flash-preview"`` route the same way and land at the
# SDK with a clean model ID.
_PROVIDER_SEGMENTS = ("google/", "anthropic/")


def _strip_provider_segment(model_id: str) -> str:
    """Drop a leading ``"<provider>/"`` segment if present.

    Matches whole segments only, so an ID like ``"gemini-3-flash-preview"``
    passes through untouched.
    """
    for segment in _PROVIDER_SEGMENTS:
        if model_id.startswith(segment):
            return model_id[len(segment) :]
    return model_id


def resolve_llm(model_id: str | None, *, user_id: uuid.UUID | None = None) -> AILLM:
    """Return the correct :class:`AILLM` for the given model ID.

    Routing:
      - ``claude-*``  → ClaudeLLM (Claude Agent SDK, native session resume)
      - ``gemini-*``  → GeminiLLM (google-genai SDK, manual history)
      - anything else → GeminiLLM with the supplied ID (pass-through)

    A leading ``"google/"`` or ``"anthropic/"`` provider segment is stripped
    before routing so the Telegram channel's ``"<provider>/<model-id>"``
    convention and the bare ``"<model-id>"`` form used by the web app both
    work.  Without this the Gemini SDK receives e.g.
    ``"google/gemini-3-flash-preview"`` and returns 404.

    Args:
        model_id: Frontend model identifier, or ``None`` to use the default.
        user_id: Authenticated user UUID, used to resolve per-workspace API key
            overrides. When ``None`` the global settings key is used.

    Returns:
        A provider instance ready to ``stream()``.
    """
    resolved = _strip_provider_segment((model_id or _DEFAULT_MODEL).strip())
    if any(resolved.startswith(p) for p in _CLAUDE_PREFIXES):
        config = ClaudeLLMConfig(
            oauth_token=settings.claude_code_oauth_token or None,
        )
        return ClaudeLLM(resolved, config=config, user_id=user_id)
    return GeminiLLM(resolved, user_id=user_id)
