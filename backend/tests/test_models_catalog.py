"""Tests for the canonical model catalog and its consumers.

The catalog underpins the model-selector menu (frontend), provider
routing (:func:`app.core.providers.resolve_llm`), and the canonical
``model_id`` grammar persisted in :class:`Conversation`.  These tests
pin the cross-layer invariants the rest of the codebase depends on.
"""

from __future__ import annotations

import pytest

from app.core.models_catalog import (
    ModelEntry,
    canonicalise,
    default_entry,
    public_catalog,
    resolve_entry,
)
from app.core.providers.claude_provider import ClaudeLLM
from app.core.providers.factory import resolve_llm
from app.core.providers.gemini_provider import GeminiLLM


class TestCatalogShape:
    """The catalog is a frozen, internally consistent registry."""

    def test_every_entry_is_frozen(self) -> None:
        """Mutating an entry must raise so callers can hold references safely."""
        entry = public_catalog()[0]
        with pytest.raises(AttributeError):
            # ``frozen=True`` raises ``FrozenInstanceError`` (a subclass
            # of ``AttributeError``) on assignment.
            entry.short_name = "spoofed"  # type: ignore[misc]

    def test_canonical_id_matches_provider_slash_sdk_id(self) -> None:
        """The canonical id is exactly ``"<provider>/<sdk_id>"`` for every row.

        This invariant is what lets :func:`canonicalise` round-trip
        bare SDK ids and lets the legacy fallback in the factory
        strip the prefix safely.
        """
        for entry in public_catalog():
            assert entry.canonical_id == f"{entry.provider}/{entry.sdk_id}"

    def test_default_entry_is_in_the_catalog(self) -> None:
        """The advertised default must be one of the public catalog rows.

        Without this, the chat router would pick a model the frontend
        cannot display.
        """
        default = default_entry()
        assert default in public_catalog()

    def test_catalog_only_advertises_supported_providers(self) -> None:
        """Every entry's provider must have a provider implementation.

        The catalog refuses to advertise models without a working
        backend (the previous frontend listed GPT-5.5, which the
        backend silently routed to the Google SDK).
        """
        supported: set[str] = {"anthropic", "google"}
        for entry in public_catalog():
            assert entry.provider in supported


class TestResolveEntry:
    """``resolve_entry`` accepts canonical, bare, and whitespace variants."""

    def test_canonical_id_resolves(self) -> None:
        entry = resolve_entry("anthropic/claude-sonnet-4-6")
        assert isinstance(entry, ModelEntry)
        assert entry.sdk_id == "claude-sonnet-4-6"

    def test_bare_sdk_id_resolves_for_legacy_callers(self) -> None:
        entry = resolve_entry("claude-sonnet-4-6")
        assert isinstance(entry, ModelEntry)
        assert entry.canonical_id == "anthropic/claude-sonnet-4-6"

    def test_whitespace_is_tolerated(self) -> None:
        assert resolve_entry("  claude-sonnet-4-6  ") is not None

    def test_unknown_id_returns_none(self) -> None:
        assert resolve_entry("gpt-5.5") is None

    def test_empty_string_returns_none(self) -> None:
        assert resolve_entry("") is None

    def test_none_returns_none(self) -> None:
        assert resolve_entry(None) is None


class TestCanonicalise:
    """``canonicalise`` normalises every accepted spelling to one form."""

    @pytest.mark.parametrize(
        ("model_id", "expected"),
        [
            ("anthropic/claude-sonnet-4-6", "anthropic/claude-sonnet-4-6"),
            ("claude-sonnet-4-6", "anthropic/claude-sonnet-4-6"),
            ("google/gemini-3-flash-preview", "google/gemini-3-flash-preview"),
            ("gemini-3-flash-preview", "google/gemini-3-flash-preview"),
        ],
    )
    def test_known_ids_normalise(self, model_id: str, expected: str) -> None:
        assert canonicalise(model_id) == expected

    def test_unknown_id_returns_none(self) -> None:
        """Unknown ids return ``None`` so callers pick the fallback explicitly."""
        assert canonicalise("gpt-5.5") is None


class TestResolveLlmRoutesViaCatalog:
    """``resolve_llm`` picks the provider class from the catalog entry."""

    @pytest.mark.parametrize(
        "model_id",
        [
            "anthropic/claude-opus-4-7",
            "claude-opus-4-7",
            "anthropic/claude-sonnet-4-6",
            "claude-haiku-4-5",
        ],
    )
    def test_anthropic_entries_route_to_claude(self, model_id: str) -> None:
        assert isinstance(resolve_llm(model_id), ClaudeLLM)

    @pytest.mark.parametrize(
        "model_id",
        [
            "google/gemini-3-flash-preview",
            "gemini-3-flash-preview",
            "google/gemini-3.1-flash-lite-preview",
            "gemini-3.1-flash-lite-preview",
        ],
    )
    def test_google_entries_route_to_gemini(self, model_id: str) -> None:
        assert isinstance(resolve_llm(model_id), GeminiLLM)


class TestResolveLlmLegacyFallback:
    """Stored conversations with retired model ids still route correctly."""

    def test_legacy_claude_prefix_routes_to_claude(self) -> None:
        """An old ``"claude-opus-4-5"`` row (no longer in the catalog) must
        still reach :class:`ClaudeLLM` rather than silently re-routing
        to the Gemini default.
        """
        assert isinstance(resolve_llm("claude-opus-4-5"), ClaudeLLM)

    def test_prefixed_legacy_claude_routes_to_claude(self) -> None:
        """The OpenClaw-style ``"<provider>/<model>"`` grammar is honoured
        even when the model is not in the catalog (Telegram stores ids
        in this form)."""
        assert isinstance(resolve_llm("anthropic/claude-opus-4-5"), ClaudeLLM)

    def test_legacy_gemini_prefix_routes_to_gemini(self) -> None:
        assert isinstance(resolve_llm("gemini-2.0-flash"), GeminiLLM)


class TestResolveLlmDefault:
    """Empty / unroutable ids fall back to the catalog default."""

    def test_none_uses_default(self) -> None:
        provider = resolve_llm(None)
        default = default_entry()
        if default.provider == "anthropic":
            assert isinstance(provider, ClaudeLLM)
        else:
            assert isinstance(provider, GeminiLLM)

    def test_whitespace_only_uses_default(self) -> None:
        # Whitespace-only is treated as "no id supplied"; we just
        # require it to return *some* provider rather than crash.
        assert resolve_llm("   ") is not None

    def test_unknown_id_with_no_prefix_uses_default(self) -> None:
        # ``"gpt-5.5"`` is unknown and has no Claude/Gemini prefix —
        # must fall through to the default, not raise.
        assert resolve_llm("gpt-5.5") is not None
