"""Provider factory — resolves model ID to AIProvider."""
from __future__ import annotations

from .agno_provider import AgnoProvider
from .claude_provider import ClaudeProvider
from .base import AIProvider

_DEFAULT_MODEL = "gemini-3-flash-preview"


def resolve_provider(model_id: str | None) -> AIProvider:
    """Return the correct AIProvider for the given model ID.

    All model IDs starting with 'claude-' route to ClaudeProvider.
    Everything else routes to AgnoProvider (Gemini + other Agno models).
    """
    resolved = (model_id or _DEFAULT_MODEL).strip()
    if resolved.startswith("claude-"):
        return ClaudeProvider(resolved)
    return AgnoProvider(resolved)
