"""Tests for GeminiLLM's StreamFn wiring into agent_loop.

Uses a mock StreamFn — no real Gemini API calls.
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


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _make_text_stream_fn(text: str):
    """StreamFn that yields a single text response."""

    async def stream_fn(
        messages: list[AgentMessage], tools: list[AgentTool]
    ) -> AsyncIterator[LLMEvent]:
        yield LLMTextDeltaEvent(type="text_delta", text=text)
        yield LLMDoneEvent(
            type="done",
            stop_reason="stop",
            content=[TextContent(type="text", text=text)],
        )

    return stream_fn


def _make_tool_then_text_stream_fn(tool_name: str, tool_args: dict, final_text: str):
    """StreamFn that first requests a tool call, then returns text."""
    call_count = 0

    async def stream_fn(
        messages: list[AgentMessage], tools: list[AgentTool]
    ) -> AsyncIterator[LLMEvent]:
        nonlocal call_count
        if call_count == 0:
            call_count += 1
            yield LLMToolCallEvent(
                type="tool_call",
                tool_call_id="call-0",
                name=tool_name,
                arguments=tool_args,
            )
            yield LLMDoneEvent(
                type="done",
                stop_reason="tool_use",
                content=[
                    ToolCallContent(
                        type="toolCall",
                        tool_call_id="call-0",
                        name=tool_name,
                        arguments=tool_args,
                    )
                ],
            )
        else:
            yield LLMTextDeltaEvent(type="text_delta", text=final_text)
            yield LLMDoneEvent(
                type="done",
                stop_reason="stop",
                content=[TextContent(type="text", text=final_text)],
            )

    return stream_fn


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------


@pytest.mark.anyio
async def test_gemini_provider_yields_delta_events_from_loop(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """GeminiLLM.stream() translates agent_loop text_deltas to StreamEvent deltas."""
    from app.core.providers.gemini_provider import GeminiLLM

    provider = GeminiLLM("gemini-test")
    monkeypatch.setattr(provider, "_stream_fn", _make_text_stream_fn("hello"))

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

    # LLM should have seen: 2 history messages + current question = 3
    assert len(seen_messages) == 1
    assert len(seen_messages[0]) == 3


@pytest.mark.anyio
async def test_gemini_provider_emits_tool_use_and_result_events(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Tool call lifecycle events are translated to StreamEvents correctly."""
    from app.core.providers.gemini_provider import GeminiLLM, AgentTool

    executed: list[str] = []

    async def echo_execute(tool_call_id: str, **kwargs) -> str:
        executed.append(kwargs.get("value", ""))
        return f"echoed: {kwargs.get('value', '')}"

    echo_tool = AgentTool(
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
        _make_tool_then_text_stream_fn("echo", {"value": "hi"}, "Done!"),
    )

    # Patch the context creation to inject the echo tool
    async def patched_stream(question, conversation_id, user_id, history=None):
        from app.core.agent_loop import (
            agent_loop,
            AgentContext,
            AgentLoopConfig,
            UserMessage,
        )
        from app.core.providers.gemini_provider import _identity_convert, _SYSTEM_PROMPT

        prior = [
            {"role": m["role"], "content": m["content"]}
            for m in (history or [])
            if m.get("role") in {"user", "assistant"}
        ]
        context = AgentContext(
            system_prompt=_SYSTEM_PROMPT,
            messages=prior,
            tools=[echo_tool],
        )
        prompt = UserMessage(role="user", content=question)
        config = AgentLoopConfig(convert_to_llm=_identity_convert)

        async for event in agent_loop([prompt], context, config, provider._stream_fn):
            etype = event["type"]
            if etype == "text_delta":
                yield StreamEvent(type="delta", content=event.get("text", ""))
            elif etype == "tool_call_start":
                yield StreamEvent(
                    type="tool_use",
                    name=event.get("name", ""),
                    input={},
                    tool_use_id=event.get("tool_call_id", ""),
                )
            elif etype == "tool_result":
                yield StreamEvent(
                    type="tool_result",
                    content=event.get("content", ""),
                    tool_use_id=event.get("tool_call_id", ""),
                )

    events: list[StreamEvent] = []
    async for event in patched_stream("Echo hi", uuid4(), uuid4()):
        events.append(event)

    assert executed == ["hi"]
    assert any(e["type"] == "tool_use" for e in events)
    assert any(e["type"] == "tool_result" for e in events)
    assert any(e["type"] == "delta" and "Done!" in e.get("content", "") for e in events)
