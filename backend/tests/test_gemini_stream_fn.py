"""Tests for GeminiLLM's StreamFn wiring into agent_loop.

Uses ``ScriptedStreamFn`` from ``tests.agent_harness`` — no real Gemini
API calls are made.  These tests exercise the provider's translation layer
(AgentEvent → StreamEvent) and confirm that safety config flows end-to-end
from ``safety_from_settings`` through ``agent_loop`` to the SSE output.
"""

from __future__ import annotations

from collections.abc import AsyncIterator
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
# Tests for extracted helpers: _resolve_gemini_api_key and _tool_calls_from_chunk
# (added in this PR to improve testability by extracting inline logic)
# ---------------------------------------------------------------------------


class TestResolveGeminiApiKey:
    """:func:`_resolve_gemini_api_key` should route key resolution correctly."""

    def test_returns_settings_key_when_user_id_is_none(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        """When user_id is None (unauthenticated call), use settings.google_api_key."""
        from app.core.providers.gemini_provider import _resolve_gemini_api_key

        monkeypatch.setattr("app.core.providers.gemini_provider.settings.google_api_key", "gw-key")
        result = _resolve_gemini_api_key(None)
        assert result == "gw-key"

    def test_returns_resolve_api_key_result_when_user_id_provided(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        """When user_id is provided, resolve_api_key is called for GEMINI_API_KEY."""
        from app.core.providers.gemini_provider import _resolve_gemini_api_key

        uid = uuid4()
        monkeypatch.setattr(
            "app.core.providers.gemini_provider.resolve_api_key",
            lambda user_id, key: "workspace-key" if user_id == uid else None,
        )
        result = _resolve_gemini_api_key(uid)
        assert result == "workspace-key"

    def test_returns_empty_string_when_user_has_no_override(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        """When the user has no per-workspace key, returns '' (not None)."""
        from app.core.providers.gemini_provider import _resolve_gemini_api_key

        monkeypatch.setattr(
            "app.core.providers.gemini_provider.resolve_api_key",
            lambda user_id, key: None,
        )
        result = _resolve_gemini_api_key(uuid4())
        # resolve_api_key returned None → the function applies `or ""`.
        assert result == ""

    def test_user_id_none_does_not_call_resolve_api_key(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        """resolve_api_key must NOT be called when user_id is None."""
        from app.core.providers.gemini_provider import _resolve_gemini_api_key

        called: list[bool] = []

        def _should_not_be_called(user_id: object, key: object) -> str:
            called.append(True)
            return "unexpected"

        monkeypatch.setattr(
            "app.core.providers.gemini_provider.resolve_api_key",
            _should_not_be_called,
        )
        monkeypatch.setattr("app.core.providers.gemini_provider.settings.google_api_key", "gw")
        _resolve_gemini_api_key(None)
        assert called == []


class TestToolCallsFromChunk:
    """:func:`_tool_calls_from_chunk` should extract function-call parts correctly."""

    def _make_chunk(self, function_calls: list[tuple[str, dict]] | None = None) -> object:
        """Build a minimal Gemini chunk-like object with optional function_call parts."""
        from types import SimpleNamespace

        if not function_calls:
            return SimpleNamespace(candidates=[])

        parts = []
        for name, args in function_calls:
            fc = SimpleNamespace(name=name, args=args)
            parts.append(SimpleNamespace(function_call=fc))

        content = SimpleNamespace(parts=parts)
        candidate = SimpleNamespace(content=content)
        return SimpleNamespace(candidates=[candidate])

    def test_empty_candidates_returns_empty_list(self) -> None:
        """A chunk with no candidates yields no tool calls."""
        from app.core.providers.gemini_provider import _tool_calls_from_chunk

        chunk = self._make_chunk()
        assert _tool_calls_from_chunk(chunk, 0) == []

    def test_none_candidates_returns_empty_list(self) -> None:
        """A chunk with candidates=None yields no tool calls."""
        from types import SimpleNamespace
        from app.core.providers.gemini_provider import _tool_calls_from_chunk

        chunk = SimpleNamespace(candidates=None)
        assert _tool_calls_from_chunk(chunk, 0) == []

    def test_candidate_with_no_function_call_parts_returns_empty(self) -> None:
        """Parts without function_call attributes are ignored."""
        from types import SimpleNamespace
        from app.core.providers.gemini_provider import _tool_calls_from_chunk

        text_part = SimpleNamespace(function_call=None)
        content = SimpleNamespace(parts=[text_part])
        candidate = SimpleNamespace(content=content)
        chunk = SimpleNamespace(candidates=[candidate])

        assert _tool_calls_from_chunk(chunk, 0) == []

    def test_single_function_call_returns_one_tool_call(self) -> None:
        """A single function_call part is returned as one dict with correct fields."""
        from app.core.providers.gemini_provider import _tool_calls_from_chunk

        chunk = self._make_chunk([("my_tool", {"param": "value"})])
        calls = _tool_calls_from_chunk(chunk, 0)

        assert len(calls) == 1
        call = calls[0]
        assert call["name"] == "my_tool"
        assert call["arguments"] == {"param": "value"}
        assert call["tool_call_id"] == "call-my_tool-0"

    def test_tool_call_id_uses_start_index_offset(self) -> None:
        """tool_call_id must be call-<name>-<start_index + position>."""
        from app.core.providers.gemini_provider import _tool_calls_from_chunk

        chunk = self._make_chunk([("search", {"q": "test"})])
        calls = _tool_calls_from_chunk(chunk, start_index=3)

        assert calls[0]["tool_call_id"] == "call-search-3"

    def test_multiple_function_calls_get_sequential_ids(self) -> None:
        """Multiple function calls in one chunk get sequential IDs."""
        from app.core.providers.gemini_provider import _tool_calls_from_chunk

        chunk = self._make_chunk([("tool_a", {}), ("tool_b", {"x": 1})])
        calls = _tool_calls_from_chunk(chunk, start_index=0)

        assert len(calls) == 2
        assert calls[0]["name"] == "tool_a"
        assert calls[0]["tool_call_id"] == "call-tool_a-0"
        assert calls[1]["name"] == "tool_b"
        assert calls[1]["tool_call_id"] == "call-tool_b-1"

    def test_start_index_offsets_all_ids(self) -> None:
        """Start index shifts all generated IDs by the given amount."""
        from app.core.providers.gemini_provider import _tool_calls_from_chunk

        chunk = self._make_chunk([("alpha", {}), ("beta", {})])
        calls = _tool_calls_from_chunk(chunk, start_index=5)

        assert calls[0]["tool_call_id"] == "call-alpha-5"
        assert calls[1]["tool_call_id"] == "call-beta-6"

    def test_empty_args_become_empty_dict(self) -> None:
        """When fc.args is falsy, arguments should be an empty dict, not None."""
        from types import SimpleNamespace
        from app.core.providers.gemini_provider import _tool_calls_from_chunk

        fc = SimpleNamespace(name="no_args_tool", args=None)
        part = SimpleNamespace(function_call=fc)
        content = SimpleNamespace(parts=[part])
        candidate = SimpleNamespace(content=content)
        chunk = SimpleNamespace(candidates=[candidate])

        calls = _tool_calls_from_chunk(chunk, 0)
        assert calls[0]["arguments"] == {}

    def test_nameless_function_call_uses_empty_string(self) -> None:
        """A function_call with name=None should yield empty string as tool name."""
        from types import SimpleNamespace
        from app.core.providers.gemini_provider import _tool_calls_from_chunk

        fc = SimpleNamespace(name=None, args={})
        part = SimpleNamespace(function_call=fc)
        content = SimpleNamespace(parts=[part])
        candidate = SimpleNamespace(content=content)
        chunk = SimpleNamespace(candidates=[candidate])

        calls = _tool_calls_from_chunk(chunk, 0)
        assert calls[0]["name"] == ""
        assert calls[0]["tool_call_id"] == "call--0"


class TestGeminiStreamReasoningEffort:
    """GeminiLLM.stream() accepts reasoning_effort for protocol parity."""

    @pytest.mark.anyio
    async def test_reasoning_effort_accepted_without_error(
        self,
        monkeypatch: pytest.MonkeyPatch,
    ) -> None:
        """GeminiLLM.stream() must not raise when reasoning_effort is set.

        Gemini ignores the value but the protocol requires accepting it.
        """
        from app.core.providers.gemini_provider import GeminiLLM

        provider = GeminiLLM("gemini-test")
        monkeypatch.setattr(provider, "_stream_fn", ScriptedStreamFn([text_turn("ok")]))

        events: list[object] = []
        async for event in provider.stream(
            question="Hi",
            conversation_id=uuid4(),
            user_id=uuid4(),
            history=[],
            reasoning_effort="extra-high",
        ):
            events.append(event)

        # The stream completed without error.
        assert len(events) >= 1

    @pytest.mark.anyio
    async def test_reasoning_effort_none_is_same_as_omitted(
        self,
        monkeypatch: pytest.MonkeyPatch,
    ) -> None:
        """Passing reasoning_effort=None should behave identically to not passing it."""
        from app.core.providers.gemini_provider import GeminiLLM
        from app.core.providers.base import StreamEvent

        provider = GeminiLLM("gemini-test")
        monkeypatch.setattr(provider, "_stream_fn", ScriptedStreamFn([text_turn("hi")]))

        events_with_none: list[StreamEvent] = []
        async for event in provider.stream(
            question="Hi",
            conversation_id=uuid4(),
            user_id=uuid4(),
            reasoning_effort=None,
        ):
            events_with_none.append(event)

        assert any(e.get("type") == "delta" for e in events_with_none)
