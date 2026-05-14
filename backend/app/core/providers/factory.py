"""Provider factory — resolves a model ID to an :class:`AILLM`.

The factory layer is the only place that reads :mod:`app.core.config`,
keeping the providers themselves config-agnostic and trivially testable
by passing :class:`ClaudeLLMConfig` directly.

Routing is driven by :mod:`app.core.models_catalog`: the catalog is the
single source of truth for which models exist and which provider backs
each.  This replaces the previous string-prefix dispatch (``if
model.startswith("claude-")``), which silently routed unknown ids
(``"gpt-5.5"``, ``"google/gemini-3-flash-preview"``) to ``GeminiLLM``
where they would fail inside the Google SDK at request time.

The catalog also documents which provider IDs we ship; the small
legacy-fallback branch below covers stored conversations whose
``model_id`` has since been retired from the public catalog (e.g. a
year-old row that still names ``"claude-opus-4-5"``).  Without this
fallback, upgrading the catalog would silently re-route every old
conversation to the default Gemini model.
"""

from __future__ import annotations

from app.core.config import settings
from app.core.models_catalog import ModelEntry, default_entry, resolve_entry

from .base import AILLM
from .claude_provider import ClaudeLLM, ClaudeLLMConfig
from .gemini_provider import GeminiLLM

# Bare prefixes used for legacy ids that have dropped out of the
# catalog.  Kept here (not in the catalog) because they describe
# *grammar*, not a routable model.
_LEGACY_ANTHROPIC_PREFIXES = ("claude-",)
_LEGACY_GOOGLE_PREFIXES = ("gemini-",)


def resolve_llm(model_id: str | None) -> AILLM:
    """Return the correct :class:`AILLM` for the given model ID.

    Resolution order:
      1. ``model_id`` is looked up in the catalog (accepting both the
         canonical ``"<provider>/<model>"`` form and the bare SDK id).
      2. If unknown, the legacy fallback inspects the bare model
         string for a provider prefix (``claude-*`` / ``gemini-*``)
         and routes to the matching provider so older conversations
         keep working without canonicalising every stored row.
      3. If still unknown — or ``model_id`` is empty — fall back to
         :func:`~app.core.models_catalog.default_entry`.

    Args:
        model_id: Frontend model identifier, or ``None`` to use the
            catalog default.

    Returns:
        A provider instance ready to ``stream()``.
    """
    entry = resolve_entry(model_id)
    if entry is not None:
        return _build_from_entry(entry)
    legacy = _legacy_provider(model_id)
    if legacy is not None:
        return legacy
    return _build_from_entry(default_entry())


def _build_from_entry(entry: ModelEntry) -> AILLM:
    """Instantiate the concrete provider for a catalog entry.

    Kept as a small helper so :func:`resolve_llm` stays a pure router
    and the per-provider construction details (e.g. forwarding the
    OAuth token to the Claude SDK subprocess) live next to the
    provider they configure.
    """
    if entry.provider == "anthropic":
        return _build_claude(entry.sdk_id)
    if entry.provider == "google":
        return GeminiLLM(entry.sdk_id)
    # Catalog typing already constrains ``provider`` to a Literal of
    # backends we ship; this guard exists so adding a new provider id
    # to the literal without wiring it here fails loudly instead of
    # silently mis-routing.
    raise RuntimeError(f"No provider implementation for {entry.provider!r}")


def _legacy_provider(model_id: str | None) -> AILLM | None:
    """Route a catalog-miss ``model_id`` based on its bare prefix.

    Strips a leading ``"<provider>/"`` segment (the OpenClaw-style
    grammar) before matching, so both ``"claude-opus-4-5"`` and
    ``"anthropic/claude-opus-4-5"`` reach the Claude provider with
    the same bare SDK id.  Returns ``None`` if the id matches no
    known prefix; the caller layers the catalog default on top.
    """
    if not model_id:
        return None
    bare = model_id.strip().rsplit("/", maxsplit=1)[-1]
    if any(bare.startswith(prefix) for prefix in _LEGACY_ANTHROPIC_PREFIXES):
        return _build_claude(bare)
    if any(bare.startswith(prefix) for prefix in _LEGACY_GOOGLE_PREFIXES):
        return GeminiLLM(bare)
    return None


def _build_claude(sdk_id: str) -> ClaudeLLM:
    """Construct :class:`ClaudeLLM` with the project's OAuth token wiring."""
    config = ClaudeLLMConfig(
        oauth_token=settings.claude_code_oauth_token or None,
    )
    return ClaudeLLM(sdk_id, config=config)
