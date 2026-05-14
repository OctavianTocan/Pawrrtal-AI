"""Canonical model catalog for the chat surface.

The single source of truth for which AI models exist and how each one
is backed.

Why this exists
---------------
Before this module the model identity question was answered in seven
different places (`factory.py`, `chat.py`, `gemini_utils.py`, the
frontend popover, the Telegram handler, the CLI commit agent, the
Claude provider's defensive ``_MODEL_MAP``).  Each used a slightly
different grammar and had its own default.  Adding or renaming a
model meant a grep-and-edit hunt with silent drift between layers.

The catalog replaces that with one immutable tuple of
:class:`ModelEntry` records.  Every other layer reads from it:

* :mod:`app.core.providers.factory` uses :func:`resolve_entry` to pick
  a provider class and SDK id.
* ``GET /api/v1/models`` returns :func:`public_catalog` so the
  frontend menu is a function of the backend's truth, not a const.
* The chat router uses :func:`default_entry` for the default model
  fallback in one place.

The canonical model id grammar is OpenClaw's ``"<provider>/<model>"``
(e.g. ``"anthropic/claude-sonnet-4-6"``).  Bare SDK ids
(``"claude-sonnet-4-6"``) are accepted as legacy aliases so existing
conversation rows and unmigrated frontend builds keep resolving — the
registry normalises both forms to the same entry.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

# Provider IDs we ship a real backend for.  Adding "openai" here
# requires implementing an ``OpenAILLM`` provider + bridge first; the
# frontend used to advertise GPT models the backend couldn't serve,
# which routed through ``GeminiLLM("gpt-5.5")`` and failed in the
# Google SDK.  Until the provider exists, the catalog refuses to
# advertise the model.
ProviderId = Literal["anthropic", "google"]
"""Closed set of providers with a working backend implementation."""

ReasoningEffort = Literal["off", "low", "medium", "high"]
"""Discrete reasoning-effort knob carried per request to providers
that expose extended thinking.  Providers that do not surface
thinking ignore non-``"off"`` values."""


@dataclass(frozen=True, slots=True)
class ModelEntry:
    """One row of the model catalog.

    Immutable so callers can hold references without worrying about
    mutation; ``slots=True`` keeps the per-instance memory small since
    the catalog is built once at import time.
    """

    canonical_id: str
    """OpenClaw-style ``"<provider>/<model>"`` identifier.  This is the
    grammar new code should always emit (and the form returned by
    ``GET /api/v1/models``).  Stored in ``Conversation.model_id`` for
    rows persisted after this commit."""

    provider: ProviderId
    """Which provider implementation backs this model."""

    sdk_id: str
    """Bare identifier passed to the provider's SDK.  Equal to the
    portion of ``canonical_id`` after the slash."""

    display_name: str
    """Full human label shown in the model menu rows."""

    short_name: str
    """Compact label shown in the composer trigger (e.g. ``"Sonnet 4.6"``)."""

    description: str
    """One-line tagline rendered under the model name in the menu."""

    context_window: int
    """Approximate context window in tokens.  Used by the frontend to
    show "fits in context" hints; not a hard limit enforced server-side."""

    supports_thinking: bool
    """Whether the provider surfaces extended thinking tokens that the
    chat aggregator can render in a separate panel.  Reasoning effort
    is only respected on entries where this is ``True``."""

    supports_tool_use: bool
    """Whether the model accepts the cross-provider ``AgentTool`` list
    assembled by the chat router."""

    supports_prompt_cache: bool
    """Whether the provider supports server-side prompt caching on the
    system+history prefix.  Anthropic models do; current Google
    Gemini Flash variants do not."""

    default_reasoning: ReasoningEffort
    """Default reasoning effort applied when the request does not
    specify one.  ``"off"`` for models without thinking; ``"medium"``
    for thinking-capable models is a balanced starting point."""


# --- Catalog ----------------------------------------------------------
#
# Declaration order is preserved by :func:`public_catalog` so the
# frontend menu can lean on it for display order without sorting.
#
# Adding a new model: append a ``ModelEntry`` row.  Removing one:
# delete the row.  Both layers — provider factory and frontend menu —
# update automatically.
_CATALOG: tuple[ModelEntry, ...] = (
    ModelEntry(
        canonical_id="anthropic/claude-opus-4-7",
        provider="anthropic",
        sdk_id="claude-opus-4-7",
        display_name="Claude Opus 4.7",
        short_name="Opus 4.7",
        description="Most capable for ambitious work",
        context_window=200_000,
        supports_thinking=True,
        supports_tool_use=True,
        supports_prompt_cache=True,
        default_reasoning="medium",
    ),
    ModelEntry(
        canonical_id="anthropic/claude-sonnet-4-6",
        provider="anthropic",
        sdk_id="claude-sonnet-4-6",
        display_name="Claude Sonnet 4.6",
        short_name="Sonnet 4.6",
        description="Balanced for everyday tasks",
        context_window=200_000,
        supports_thinking=True,
        supports_tool_use=True,
        supports_prompt_cache=True,
        default_reasoning="medium",
    ),
    ModelEntry(
        canonical_id="anthropic/claude-haiku-4-5",
        provider="anthropic",
        sdk_id="claude-haiku-4-5",
        display_name="Claude Haiku 4.5",
        short_name="Haiku 4.5",
        description="Fastest for quick answers",
        context_window=200_000,
        supports_thinking=True,
        supports_tool_use=True,
        supports_prompt_cache=True,
        default_reasoning="low",
    ),
    ModelEntry(
        canonical_id="google/gemini-3-flash-preview",
        provider="google",
        sdk_id="gemini-3-flash-preview",
        display_name="Gemini 3 Flash Preview",
        short_name="Gemini 3 Flash",
        description="Google's frontier multimodal",
        context_window=1_000_000,
        supports_thinking=False,
        supports_tool_use=True,
        supports_prompt_cache=False,
        default_reasoning="off",
    ),
    ModelEntry(
        canonical_id="google/gemini-3.1-flash-lite-preview",
        provider="google",
        sdk_id="gemini-3.1-flash-lite-preview",
        display_name="Gemini 3.1 Flash Lite Preview",
        short_name="Gemini Flash Lite",
        description="Light and fast Gemini",
        context_window=1_000_000,
        supports_thinking=False,
        supports_tool_use=True,
        supports_prompt_cache=False,
        default_reasoning="off",
    ),
)


# The canonical default lives next to the data it picks from, not in
# the chat router, so changing the default is a one-line edit here.
_DEFAULT_CANONICAL_ID = "google/gemini-3-flash-preview"


def _build_alias_map() -> dict[str, ModelEntry]:
    """Index every accepted spelling of a model id to its entry.

    The map carries both the canonical ``"<provider>/<model>"`` form
    and the bare ``sdk_id`` so legacy callers — pre-migration DB rows,
    older frontend builds, the Claude SDK passthrough, the
    Telegram handler's stored model_id — all resolve to the same row.
    """
    alias_map: dict[str, ModelEntry] = {}
    for entry in _CATALOG:
        alias_map[entry.canonical_id] = entry
        # The bare form must not collide with another model's canonical
        # form; assert here so a future provider rename that reintroduces
        # collisions fails loudly at import time rather than silently
        # routing the wrong way.
        existing = alias_map.get(entry.sdk_id)
        if existing is not None and existing.canonical_id != entry.canonical_id:
            raise RuntimeError(
                f"Model catalog alias collision on {entry.sdk_id!r}: "
                f"{existing.canonical_id!r} vs {entry.canonical_id!r}"
            )
        alias_map[entry.sdk_id] = entry
    return alias_map


_ALIAS_MAP: dict[str, ModelEntry] = _build_alias_map()


def resolve_entry(model_id: str | None) -> ModelEntry | None:
    """Return the catalog entry for ``model_id``, or ``None`` if unknown.

    Accepts the canonical ``"<provider>/<model>"`` form, the bare SDK
    id, or any whitespace-padded variant.  ``None`` / empty string
    return ``None`` so callers can layer a default in one place
    (typically :func:`default_entry`).
    """
    if not model_id:
        return None
    return _ALIAS_MAP.get(model_id.strip())


def default_entry() -> ModelEntry:
    """Return the catalog's default model.

    Centralised so the chat router, Telegram handler, and CLI all
    share one default — the previous codebase had five competing
    ``_DEFAULT_MODEL`` constants that drifted from each other.
    """
    default = _ALIAS_MAP.get(_DEFAULT_CANONICAL_ID)
    if default is None:
        # Catalog invariant: the configured default must exist.  If
        # this fires the catalog was edited without updating the
        # constant — fix at import time rather than at request time.
        raise RuntimeError(
            f"Default model {_DEFAULT_CANONICAL_ID!r} is not present in the catalog."
        )
    return default


def public_catalog() -> tuple[ModelEntry, ...]:
    """Return the immutable catalog in declaration order.

    Used by ``GET /api/v1/models`` to publish the list to the
    frontend.  Returning the underlying tuple is safe because
    :class:`ModelEntry` is frozen.
    """
    return _CATALOG


def canonicalise(model_id: str | None) -> str | None:
    """Normalise any accepted spelling to the canonical id.

    Returns ``None`` if ``model_id`` is unknown so callers can decide
    whether to fall back to the default or surface a 404 — this helper
    deliberately does not pick one for them.
    """
    entry = resolve_entry(model_id)
    return entry.canonical_id if entry is not None else None
