"""Tests for deferred Sigil paths (Claude stream helpers, Gemini SYNC)."""

from __future__ import annotations

from unittest.mock import MagicMock

import pytest

from app.core.providers.base import StreamEvent
from app.core.telemetry import sigil_runtime
from app.core.telemetry.sigil_claude import (
    ClaudeSigilAccum,
    apply_claude_stream_event_for_sigil,
    finalize_claude_streaming_generation,
    make_claude_generation_start,
)
from app.core.telemetry.sigil_gemini import make_generation_start


@pytest.fixture(autouse=True)
def _reset_sigil_runtime(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("SIGIL_AUTH_TOKEN", raising=False)
    monkeypatch.delenv("SIGIL_INSTRUMENTATION_ONLY", raising=False)
    monkeypatch.delenv("SIGIL_DISABLED", raising=False)
    sigil_runtime.shutdown_sigil_runtime()
    yield
    sigil_runtime.shutdown_sigil_runtime()


def test_make_claude_generation_start_tags() -> None:
    start = make_claude_generation_start("claude-sonnet-4-5", "conv-1")
    assert start.conversation_id == "conv-1"
    assert start.model.provider == "anthropic"
    assert start.model.name == "claude-sonnet-4-5"
    assert start.tags.get("pipeline") == "claude-agent-sdk"


def test_apply_claude_stream_event_for_sigil_delta_and_tool() -> None:
    accum = ClaudeSigilAccum()
    rec = MagicMock()
    first = [False]
    apply_claude_stream_event_for_sigil(
        StreamEvent(type="delta", content="hello"),
        rec,
        first_mark=first,
        accum=accum,
    )
    assert accum.full_text_chunks == ["hello"]
    apply_claude_stream_event_for_sigil(
        StreamEvent(type="tool_use", name="web_search", tool_use_id="tu1", input={"q": "x"}),
        rec,
        first_mark=first,
        accum=accum,
    )
    assert len(accum.tool_calls) == 1
    assert accum.tool_calls[0]["name"] == "web_search"


def test_finalize_claude_streaming_generation_calls_set_result() -> None:
    rec = MagicMock()
    accum = ClaudeSigilAccum()
    accum.full_text_chunks.append("done")
    finalize_claude_streaming_generation(
        rec,
        question="hi",
        response_model="claude-sonnet-4-5",
        accum=accum,
    )
    rec.set_result.assert_called_once()
    call_kw = rec.set_result.call_args.kwargs
    assert call_kw["stop_reason"] == "stop"
    assert call_kw["response_model"] == "claude-sonnet-4-5"


def test_make_generation_start_matches_gemini_provider_shape() -> None:
    start = make_generation_start("gemini-1.5-flash", "c1", operation_name="generateContent")
    assert start.operation_name == "generateContent"
    assert start.model.name == "gemini-1.5-flash"
