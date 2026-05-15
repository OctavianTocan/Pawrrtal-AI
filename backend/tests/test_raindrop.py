"""Tests for the Raindrop AI analytics integration.

Covers: feature-flag guard, setup idempotency, track_ai_turn no-op path,
and the Workshop OTLP exporter wired into telemetry.py.
"""

from __future__ import annotations

from unittest.mock import MagicMock, patch

import pytest

import app.core.raindrop as rd_module
from app.core.raindrop import raindrop_analytics_enabled, setup_raindrop, track_ai_turn
from app.core.telemetry import _workshop_url

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


@pytest.fixture(autouse=True)
def _reset_raindrop_state() -> None:  # type: ignore[return]
    """Reset the module-level _initialised flag between tests."""
    original = rd_module._initialised
    yield
    rd_module._initialised = original


# ---------------------------------------------------------------------------
# raindrop_analytics_enabled()
# ---------------------------------------------------------------------------


class TestRaindropAnalyticsEnabled:
    """Feature-flag guard reads the env var correctly."""

    def test_disabled_when_env_unset(self, monkeypatch: pytest.MonkeyPatch) -> None:
        monkeypatch.delenv("RAINDROP_API_KEY", raising=False)
        assert raindrop_analytics_enabled() is False

    def test_enabled_when_env_set(self, monkeypatch: pytest.MonkeyPatch) -> None:
        monkeypatch.setenv("RAINDROP_API_KEY", "rd_test_key")
        assert raindrop_analytics_enabled() is True


# ---------------------------------------------------------------------------
# setup_raindrop()
# ---------------------------------------------------------------------------


class TestSetupRaindrop:
    """Lifecycle: no-op, idempotency, import error handling."""

    def test_no_op_when_key_unset(self, monkeypatch: pytest.MonkeyPatch) -> None:
        monkeypatch.delenv("RAINDROP_API_KEY", raising=False)
        rd_module._initialised = False

        setup_raindrop()

        # Flag is set (prevents future retries) but no SDK was called.
        assert rd_module._initialised is True

    def test_idempotent(self, monkeypatch: pytest.MonkeyPatch) -> None:
        """Calling setup_raindrop() twice must not call rd.init() twice."""
        monkeypatch.setenv("RAINDROP_API_KEY", "rd_test_key")
        rd_module._initialised = False
        fake_rd = MagicMock()
        # `import raindrop.analytics as rd` uses IMPORT_FROM, which is
        # `getattr(sys.modules["raindrop"], "analytics")` — not the
        # sys.modules["raindrop.analytics"] entry.  Wire them together.
        mock_raindrop = MagicMock()
        mock_raindrop.analytics = fake_rd
        with patch.dict("sys.modules", {"raindrop": mock_raindrop, "raindrop.analytics": fake_rd}):
            setup_raindrop()
            setup_raindrop()
        # rd.init() must be called exactly once despite two setup calls.
        assert fake_rd.init.call_count == 1

    def test_handles_import_error_gracefully(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        """Missing raindrop-ai package must log a warning but not raise."""
        monkeypatch.setenv("RAINDROP_API_KEY", "rd_test_key")
        rd_module._initialised = False
        # Setting raindrop to None causes ImportError on `import raindrop.analytics`
        # — exercising the graceful degradation path.
        with patch.dict("sys.modules", {"raindrop": None, "raindrop.analytics": None}):
            # Must not raise even when the package is absent.
            setup_raindrop()


# ---------------------------------------------------------------------------
# track_ai_turn()
# ---------------------------------------------------------------------------


class TestTrackAiTurn:
    """track_ai_turn() delegates to rd.track_ai or is silently skipped."""

    def test_no_op_when_disabled(self, monkeypatch: pytest.MonkeyPatch) -> None:
        monkeypatch.delenv("RAINDROP_API_KEY", raising=False)
        rd_module._initialised = False

        # Must not raise and must not import raindrop.
        track_ai_turn(
            model_id="claude-sonnet-4-6",
            question="What is 2+2?",
            response="4",
            conversation_id="conv-uuid",
            user_id="user-uuid",
        )

    def test_calls_track_ai_when_enabled(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        monkeypatch.setenv("RAINDROP_API_KEY", "rd_test_key")
        rd_module._initialised = True
        fake_rd = MagicMock()
        mock_raindrop = MagicMock()
        mock_raindrop.analytics = fake_rd
        with patch.dict("sys.modules", {"raindrop": mock_raindrop, "raindrop.analytics": fake_rd}):
            track_ai_turn(
                model_id="claude-sonnet-4-6",
                question="What is 2+2?",
                response="4",
                conversation_id="conv-uuid",
                user_id="user-uuid",
                tool_calls=[{"name": "search", "id": "tc1", "input": {}, "status": "completed"}],
                duration_ms=320.0,
            )

        fake_rd.track_ai.assert_called_once()
        kwargs = fake_rd.track_ai.call_args.kwargs
        assert kwargs["model"] == "claude-sonnet-4-6"
        assert kwargs["input"] == "What is 2+2?"
        assert kwargs["output"] == "4"
        assert kwargs["conversation_id"] == "conv-uuid"
        assert kwargs["user_id"] == "user-uuid"
        assert kwargs["properties"]["tool_call_count"] == 1
        assert kwargs["properties"]["duration_ms"] == 320

    def test_swallows_sdk_exceptions(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        """SDK failures must never propagate to the chat path."""
        monkeypatch.setenv("RAINDROP_API_KEY", "rd_test_key")
        rd_module._initialised = True
        fake_rd = MagicMock()
        fake_rd.track_ai.side_effect = RuntimeError("SDK exploded")
        mock_raindrop = MagicMock()
        mock_raindrop.analytics = fake_rd
        with patch.dict("sys.modules", {"raindrop": mock_raindrop, "raindrop.analytics": fake_rd}):
            # Must not raise — analytics must never break the chat path.
            track_ai_turn(
                model_id="claude-sonnet-4-6",
                question="test",
                response="test",
                conversation_id="c",
                user_id="u",
            )


# ---------------------------------------------------------------------------
# telemetry.py: Workshop OTLP mirror helpers
# ---------------------------------------------------------------------------


class TestWorkshopOtlpMirror:
    """Workshop secondary exporter URL helpers behave correctly."""

    def test_workshop_url_parsed(self, monkeypatch: pytest.MonkeyPatch) -> None:
        monkeypatch.setenv("RAINDROP_WORKSHOP_URL", "http://localhost:5899")
        assert _workshop_url() == "http://localhost:5899"

    def test_workshop_url_trailing_slash_stripped(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        monkeypatch.setenv("RAINDROP_WORKSHOP_URL", "http://localhost:5899/")
        assert _workshop_url() == "http://localhost:5899"

    def test_workshop_url_empty_when_unset(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        monkeypatch.delenv("RAINDROP_WORKSHOP_URL", raising=False)
        assert _workshop_url() == ""
