"""Tests for GeminiLLM's StreamFn wiring into agent_loop.

Uses ``ScriptedStreamFn`` from ``tests.agent_harness`` — no real Gemini
API calls are made.  These tests exercise the provider's translation layer
(AgentEvent → StreamEvent) and confirm that safety config flows end-to-end
from ``safety_from_settings`` through ``agent_loop`` to the SSE output.
"""

from __future__ import annotations

from collections.abc import AsyncIterator
from types import SimpleNamespace
from unittest.mock import patch
from uuid import uuid4

import pytest

from app.core.agent_loop.types import (
    AgentMessage,
    AgentTool,
    LLMDoneEvent,
    LLMEvent,
    LLMTextDeltaEvent,
    LLMToolCallEvent,
    TextContent,
    ToolCallContent,
)
from app.core.providers.base import StreamEvent
from tests.agent_harness import (
    ScriptedStreamFn,
    echo_tool,
    text_turn,
    tool_call_turn,
)

# ---------------------------------------------------------------------------
# Test 1 — delta events pass through the provider translation layer
# ---------------------------------------------------------------------------


@pytest.mark.anyio
async def test_gemini_provider_yields_delta_events_from_loop(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """GeminiLLM.stream() translates agent_loop text_deltas to StreamEvent deltas."""
    from app.core.providers.gemini_provider import GeminiLLM

    provider = GeminiLLM("gemini-test")
    monkeypatch.setattr(provider, "_stream_fn", ScriptedStreamFn([text_turn("hello")]))

    events: list[StreamEvent] = []
    async for event in provider.stream(
        question="Hi",
        conversation_id=uuid4(),
        user_id=uuid4(),
        history=[],
    ):
        events.append(event)

    delta_events = [e for e in events if e["type"] == "delta"]
    assert len(delta_events) >= 1
    assert any("hello" in e.get("content", "") for e in delta_events)


# ---------------------------------------------------------------------------
# Test 2 — history is included in the message list seen by the StreamFn
# ---------------------------------------------------------------------------


@pytest.mark.anyio
async def test_gemini_provider_passes_history_to_loop(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Prior messages in history are included in what the StreamFn sees."""
    from app.core.providers.gemini_provider import GeminiLLM

    seen_messages: list[list[AgentMessage]] = []

    async def recording_stream_fn(
        messages: list[AgentMessage], tools: list[AgentTool]
    ) -> AsyncIterator[LLMEvent]:
        seen_messages.append(list(messages))
        yield LLMTextDeltaEvent(type="text_delta", text="ok")
        yield LLMDoneEvent(
            type="done",
            stop_reason="stop",
            content=[TextContent(type="text", text="ok")],
        )

    provider = GeminiLLM("gemini-test")
    monkeypatch.setattr(provider, "_stream_fn", recording_stream_fn)

    history = [
        {"role": "user", "content": "What is 2+2?"},
        {"role": "assistant", "content": "4"},
    ]

    async for _ in provider.stream(
        question="And 3+3?",
        conversation_id=uuid4(),
        user_id=uuid4(),
        history=history,
    ):
        pass

    # 2 history messages + current question = 3 total.
    assert len(seen_messages) == 1
    assert len(seen_messages[0]) == 3


# ---------------------------------------------------------------------------
# Test 3 — tool call lifecycle events translate correctly to StreamEvents
# ---------------------------------------------------------------------------


@pytest.mark.anyio
async def test_gemini_provider_emits_tool_use_and_result_events(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Tool call lifecycle events translate from AgentEvents to StreamEvents.

    Uses the real GeminiLLM.stream() with a ScriptedStreamFn so we exercise
    the provider's own translation code, not a hand-rolled reimplementation.
    """
    from app.core.providers.gemini_provider import GeminiLLM

    executed: list[str] = []

    async def echo_execute(tool_call_id: str, **kwargs: object) -> str:
        executed.append(str(kwargs.get("value", "")))
        return f"echoed: {kwargs.get('value', '')}"

    from app.core.agent_loop.types import AgentTool as AT

    echo = AT(
        name="echo",
        description="Echo",
        parameters={
            "type": "object",
            "properties": {"value": {"type": "string"}},
            "required": ["value"],
        },
        execute=echo_execute,
    )

    provider = GeminiLLM("gemini-test")
    monkeypatch.setattr(
        provider,
        "_stream_fn",
        ScriptedStreamFn(
            [
                tool_call_turn("echo", {"value": "hi"}, turn_id="tc-0"),
                text_turn("Done!"),
            ]
        ),
    )

    events: list[StreamEvent] = []
    async for event in provider.stream(
        question="Echo hi",
        conversation_id=uuid4(),
        user_id=uuid4(),
        history=[],
        tools=[echo],
    ):
        events.append(event)

    # The real tool executed.
    assert executed == ["hi"]

    # All three event types appeared in the SSE stream.
    assert any(e["type"] == "tool_use" for e in events)
    assert any(e["type"] == "tool_result" for e in events)
    assert any(e["type"] == "delta" and "Done!" in e.get("content", "") for e in events)


# ---------------------------------------------------------------------------
# Test 4 — safety config is wired and terminates a runaway loop
# ---------------------------------------------------------------------------


@pytest.mark.anyio
async def test_gemini_provider_surfaces_agent_terminated_from_safety_config(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """safety_from_settings flows through GeminiLLM to agent_loop.

    Patches ``safety_from_settings`` to return ``max_iterations=3`` and
    injects a script with 10 tool-call turns.  After 3 iterations the
    safety layer must emit an ``agent_terminated`` StreamEvent; the script
    must be cut short at exactly 3 calls.

    This proves the full chain:
        safety_from_settings → AgentLoopConfig.safety → agent_loop →
        AgentTerminatedEvent → GeminiLLM.stream() → StreamEvent("agent_terminated")
    """
    from app.core.agent_loop import AgentSafetyConfig
    from app.core.providers.gemini_provider import GeminiLLM

    # 10-turn runaway script — much more than the 3-iteration limit.
    turns = [tool_call_turn("ping", {}, turn_id=f"tc-{i}") for i in range(10)]
    script = ScriptedStreamFn(turns)

    provider = GeminiLLM("gemini-test")
    monkeypatch.setattr(provider, "_stream_fn", script)

    # Patch the safety factory to inject a tight limit.
    monkeypatch.setattr(
        "app.core.providers.gemini_provider.safety_from_settings",
        lambda _settings: AgentSafetyConfig(
            max_iterations=3,
            max_wall_clock_seconds=None,
            max_consecutive_llm_errors=None,
            max_consecutive_tool_errors=None,
        ),
    )

    events: list[StreamEvent] = []
    async for event in provider.stream(
        question="go",
        conversation_id=uuid4(),
        user_id=uuid4(),
        history=[],
        tools=[echo_tool("ping")],
    ):
        events.append(event)

    # The termination event surfaces as a StreamEvent.
    terminated = [e for e in events if e["type"] == "agent_terminated"]
    assert len(terminated) == 1
    assert "max_iterations" in terminated[0]["content"]

    # The script was cut short — no more than 3 LLM calls.
    assert script.call_count == 3


# ---------------------------------------------------------------------------
# Test 5 — tool result is included in context for the subsequent LLM call
# ---------------------------------------------------------------------------


@pytest.mark.anyio
async def test_gemini_provider_accumulates_tool_result_in_context(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Each LLM turn receives more messages than the previous one.

    After the tool executes, the second call's message list must include a
    ``toolResult`` role, proving history accumulation flows through
    GeminiLLM.stream() → agent_loop.
    """
    from app.core.providers.gemini_provider import GeminiLLM

    seen_per_call: list[int] = []
    second_call_roles: list[str] = []
    # Use a list as a mutable counter to avoid nonlocal + inline import conflicts.
    turn_counter: list[int] = [0]

    async def recording_fn(
        messages: list[AgentMessage], tools: list[AgentTool]
    ) -> AsyncIterator[LLMEvent]:
        idx = turn_counter[0]
        turn_counter[0] += 1
        seen_per_call.append(len(messages))
        if idx == 1:
            second_call_roles.extend(m["role"] for m in messages)

        if idx == 0:
            # First turn: request a tool call.
            yield LLMToolCallEvent(
                type="tool_call",
                tool_call_id="tc-r",
                name="echo",
                arguments={"value": "ctx"},
            )
            yield LLMDoneEvent(
                type="done",
                stop_reason="tool_use",
                content=[
                    ToolCallContent(
                        type="toolCall",
                        tool_call_id="tc-r",
                        name="echo",
                        arguments={"value": "ctx"},
                    )
                ],
            )
        else:
            # Subsequent turns: reply with text.
            yield LLMTextDeltaEvent(type="text_delta", text="done")
            yield LLMDoneEvent(
                type="done",
                stop_reason="stop",
                content=[TextContent(type="text", text="done")],
            )

    provider = GeminiLLM("gemini-test")
    monkeypatch.setattr(provider, "_stream_fn", recording_fn)

    async for _ in provider.stream(
        question="go",
        conversation_id=uuid4(),
        user_id=uuid4(),
        history=[],
        tools=[echo_tool()],
    ):
        pass

    # Two LLM calls were made.
    assert len(seen_per_call) == 2

    # Second call sees more messages than the first.
    assert seen_per_call[1] > seen_per_call[0]

    # Second call's message list includes the tool result.
    assert "toolResult" in second_call_roles


# ---------------------------------------------------------------------------
# _resolve_gemini_api_key — new PR helper
# ---------------------------------------------------------------------------


def test_resolve_gemini_api_key_no_user_returns_settings_key(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """With user_id=None, the function returns settings.google_api_key."""
    from app.core.providers.gemini_provider import _resolve_gemini_api_key

    monkeypatch.setattr("app.core.providers.gemini_provider.settings.google_api_key", "gw-key-123")
    result = _resolve_gemini_api_key(None)
    assert result == "gw-key-123"


def test_resolve_gemini_api_key_user_with_no_override_returns_empty(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """With a user_id but no workspace override, resolve_api_key returns None → ''."""
    from app.core.providers.gemini_provider import _resolve_gemini_api_key

    uid = uuid4()
    monkeypatch.setattr(
        "app.core.providers.gemini_provider.resolve_api_key",
        lambda user_id, key_name: None,
    )
    result = _resolve_gemini_api_key(uid)
    assert result == ""


def test_resolve_gemini_api_key_user_with_override_returns_override(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """When the user has a workspace override, that value is returned."""
    from app.core.providers.gemini_provider import _resolve_gemini_api_key

    uid = uuid4()
    monkeypatch.setattr(
        "app.core.providers.gemini_provider.resolve_api_key",
        lambda user_id, key_name: "personal-gemini-key",
    )
    result = _resolve_gemini_api_key(uid)
    assert result == "personal-gemini-key"


# ---------------------------------------------------------------------------
# _tool_calls_from_chunk — new PR helper
# ---------------------------------------------------------------------------


def _make_chunk(candidates: list | None) -> SimpleNamespace:
    """Build a minimal fake Gemini streaming chunk."""
    return SimpleNamespace(candidates=candidates)


def _make_function_call_part(name: str, args: dict | None = None) -> SimpleNamespace:
    """Build a fake Gemini Part with a function_call."""
    fc = SimpleNamespace(name=name, args=args or {})
    return SimpleNamespace(function_call=fc)


def _make_text_part() -> SimpleNamespace:
    """Build a fake Gemini Part without a function_call."""
    return SimpleNamespace(function_call=None)


def _make_candidate(parts: list) -> SimpleNamespace:
    """Build a fake Gemini Candidate with parts."""
    content = SimpleNamespace(parts=parts)
    return SimpleNamespace(content=content)


def test_tool_calls_from_chunk_no_candidates_returns_empty() -> None:
    """A chunk with candidates=None returns an empty list."""
    from app.core.providers.gemini_provider import _tool_calls_from_chunk

    chunk = _make_chunk(None)
    assert _tool_calls_from_chunk(chunk, 0) == []


def test_tool_calls_from_chunk_empty_candidates_returns_empty() -> None:
    """A chunk with candidates=[] returns an empty list."""
    from app.core.providers.gemini_provider import _tool_calls_from_chunk

    chunk = _make_chunk([])
    assert _tool_calls_from_chunk(chunk, 0) == []


def test_tool_calls_from_chunk_candidate_no_content_returns_empty() -> None:
    """A candidate without content is skipped."""
    from app.core.providers.gemini_provider import _tool_calls_from_chunk

    candidate = SimpleNamespace(content=None)
    chunk = _make_chunk([candidate])
    assert _tool_calls_from_chunk(chunk, 0) == []


def test_tool_calls_from_chunk_candidate_no_parts_returns_empty() -> None:
    """A candidate with empty parts is skipped."""
    from app.core.providers.gemini_provider import _tool_calls_from_chunk

    candidate = SimpleNamespace(content=SimpleNamespace(parts=None))
    chunk = _make_chunk([candidate])
    assert _tool_calls_from_chunk(chunk, 0) == []


def test_tool_calls_from_chunk_text_only_part_returns_empty() -> None:
    """A chunk with only text parts (no function_call) returns an empty list."""
    from app.core.providers.gemini_provider import _tool_calls_from_chunk

    parts = [_make_text_part()]
    chunk = _make_chunk([_make_candidate(parts)])
    assert _tool_calls_from_chunk(chunk, 0) == []


def test_tool_calls_from_chunk_single_function_call() -> None:
    """A single function call part produces one entry with correct fields."""
    from app.core.providers.gemini_provider import _tool_calls_from_chunk

    parts = [_make_function_call_part("my_tool", {"key": "val"})]
    chunk = _make_chunk([_make_candidate(parts)])
    result = _tool_calls_from_chunk(chunk, 0)

    assert len(result) == 1
    assert result[0]["name"] == "my_tool"
    assert result[0]["arguments"] == {"key": "val"}
    assert result[0]["tool_call_id"] == "call-my_tool-0"


def test_tool_calls_from_chunk_start_index_offsets_id() -> None:
    """start_index shifts the numeric suffix in tool_call_id."""
    from app.core.providers.gemini_provider import _tool_calls_from_chunk

    parts = [_make_function_call_part("search")]
    chunk = _make_chunk([_make_candidate(parts)])
    result = _tool_calls_from_chunk(chunk, start_index=5)

    assert result[0]["tool_call_id"] == "call-search-5"


def test_tool_calls_from_chunk_multiple_parts_consecutive_ids() -> None:
    """Multiple function-call parts in one candidate get consecutive IDs."""
    from app.core.providers.gemini_provider import _tool_calls_from_chunk

    parts = [
        _make_function_call_part("tool_a", {"x": 1}),
        _make_function_call_part("tool_b", {"y": 2}),
    ]
    chunk = _make_chunk([_make_candidate(parts)])
    result = _tool_calls_from_chunk(chunk, start_index=0)

    assert len(result) == 2
    assert result[0]["tool_call_id"] == "call-tool_a-0"
    assert result[1]["tool_call_id"] == "call-tool_b-1"


def test_tool_calls_from_chunk_no_args_defaults_to_empty_dict() -> None:
    """A function call with no args gets an empty dict as arguments."""
    from app.core.providers.gemini_provider import _tool_calls_from_chunk

    fc = SimpleNamespace(name="no_args_tool", args=None)
    part = SimpleNamespace(function_call=fc)
    chunk = _make_chunk([_make_candidate([part])])
    result = _tool_calls_from_chunk(chunk, 0)

    assert result[0]["arguments"] == {}


def test_tool_calls_from_chunk_none_name_defaults_to_empty_string() -> None:
    """A function call with name=None gets '' as the name."""
    from app.core.providers.gemini_provider import _tool_calls_from_chunk

    fc = SimpleNamespace(name=None, args={})
    part = SimpleNamespace(function_call=fc)
    chunk = _make_chunk([_make_candidate([part])])
    result = _tool_calls_from_chunk(chunk, 0)

    assert result[0]["name"] == ""
    assert result[0]["tool_call_id"] == "call--0"
