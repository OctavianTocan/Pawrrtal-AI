"""Tests for the Claude StreamFn adapter (``claude_stream_fn_provider.py``).

Mirrors the structure of ``test_gemini_stream_fn.py``:
- ``make_claude_stream_fn`` is unit-tested against a mocked Anthropic client.
- ``ClaudeStreamFnProvider`` is smoke-tested with a mocked stream_fn.

Anthropic streaming uses server-sent events with typed objects; we mock the
``client.messages.stream`` async context manager to yield fake event objects.
"""
from __future__ import annotations

import json
import types
from collections.abc import AsyncIterator
from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.core.agent_loop.types import (
    AgentContext,
    AgentLoopConfig,
    AgentMessage,
    AgentTool,
    UserMessage,
)
from app.core.providers.claude_stream_fn_provider import (
    ClaudeStreamFnProvider,
    _build_anthropic_messages,
    _build_anthropic_tools,
    make_claude_stream_fn,
)


# ---------------------------------------------------------------------------
# Helpers — fake Anthropic stream events
# ---------------------------------------------------------------------------


def _text_event(text: str) -> MagicMock:
    ev = MagicMock()
    ev.type = "content_block_delta"
    ev.delta = MagicMock()
    ev.delta.type = "text_delta"
    ev.delta.text = text
    return ev


def _tool_start_event(tool_id: str, name: str) -> MagicMock:
    ev = MagicMock()
    ev.type = "content_block_start"
    ev.content_block = MagicMock()
    ev.content_block.type = "tool_use"
    ev.content_block.id = tool_id
    ev.content_block.name = name
    return ev


def _json_delta_event(partial_json: str) -> MagicMock:
    ev = MagicMock()
    ev.type = "content_block_delta"
    ev.delta = MagicMock()
    ev.delta.type = "input_json_delta"
    ev.delta.partial_json = partial_json
    return ev


def _block_stop_event() -> MagicMock:
    ev = MagicMock()
    ev.type = "content_block_stop"
    return ev


def _unhandled_event(etype: str) -> MagicMock:
    ev = MagicMock()
    ev.type = etype
    return ev


async def _fake_stream(events: list[MagicMock]) -> AsyncIterator[MagicMock]:
    for ev in events:
        yield ev


class _FakeStreamContext:
    """Async context manager that yields a fake stream iterator."""

    def __init__(self, events: list[MagicMock]) -> None:
        self._events = events

    async def __aenter__(self) -> AsyncIterator[MagicMock]:
        return _fake_stream(self._events)

    async def __aexit__(self, *_: Any) -> None:
        pass


# ---------------------------------------------------------------------------
# _build_anthropic_messages
# ---------------------------------------------------------------------------


def test_build_messages_user_only() -> None:
    msgs: list[AgentMessage] = [UserMessage(role="user", content="Hello")]
    result = _build_anthropic_messages(msgs)
    assert result == [{"role": "user", "content": "Hello"}]


def test_build_messages_skips_empty_user() -> None:
    msgs: list[AgentMessage] = [UserMessage(role="user", content="  ")]
    result = _build_anthropic_messages(msgs)
    assert result == []


def test_build_messages_assistant_string() -> None:
    msgs: list[AgentMessage] = [
        {"role": "assistant", "content": "Hi there", "stop_reason": "stop"}  # type: ignore[typeddict-item]
    ]
    result = _build_anthropic_messages(msgs)
    assert result == [{"role": "assistant", "content": "Hi there"}]


def test_build_messages_tool_result() -> None:
    msgs: list[AgentMessage] = [
        {
            "role": "toolResult",  # type: ignore[typeddict-item]
            "tool_call_id": "tc-1",
            "content": [{"type": "text", "text": "search result"}],
            "is_error": False,
        }
    ]
    result = _build_anthropic_messages(msgs)
    assert len(result) == 1
    assert result[0]["role"] == "user"
    assert result[0]["content"][0]["type"] == "tool_result"
    assert result[0]["content"][0]["tool_use_id"] == "tc-1"
    assert result[0]["content"][0]["content"] == "search result"


# ---------------------------------------------------------------------------
# _build_anthropic_tools
# ---------------------------------------------------------------------------


def test_build_anthropic_tools_empty() -> None:
    assert _build_anthropic_tools([]) == []


def test_build_anthropic_tools_single() -> None:
    async def noop(**_: Any) -> str:
        return ""

    tool = AgentTool(
        name="my_tool",
        description="Does a thing",
        parameters={"type": "object", "properties": {"x": {"type": "string"}}},
        execute=noop,
    )
    result = _build_anthropic_tools([tool])
    assert result == [
        {
            "name": "my_tool",
            "description": "Does a thing",
            "input_schema": {"type": "object", "properties": {"x": {"type": "string"}}},
        }
    ]


# ---------------------------------------------------------------------------
# make_claude_stream_fn — text-only turn
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_stream_fn_text_only() -> None:
    events = [
        _text_event("Hello"),
        _text_event(" world"),
        _unhandled_event("message_start"),
        _unhandled_event("message_stop"),
    ]
    stream_ctx = _FakeStreamContext(events)

    with patch("app.core.providers.claude_stream_fn_provider.anthropic") as mock_anthropic:
        mock_client = MagicMock()
        mock_anthropic.AsyncAnthropic.return_value = mock_client
        mock_anthropic.APIError = Exception
        mock_client.messages.stream.return_value = stream_ctx

        stream_fn = make_claude_stream_fn("claude-sonnet-4-5")
        msgs: list[AgentMessage] = [UserMessage(role="user", content="Hi")]
        collected = [ev async for ev in stream_fn(msgs, [])]

    text_events = [e for e in collected if e["type"] == "text_delta"]
    done_events = [e for e in collected if e["type"] == "done"]

    assert len(text_events) == 2
    assert text_events[0]["text"] == "Hello"
    assert text_events[1]["text"] == " world"
    assert len(done_events) == 1
    assert done_events[0]["stop_reason"] == "stop"
    full = "".join(e["text"] for e in text_events)
    assert full == "Hello world"


# ---------------------------------------------------------------------------
# make_claude_stream_fn — tool call turn
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_stream_fn_tool_call() -> None:
    tool_args = json.dumps({"query": "latest AI news"})
    events = [
        _tool_start_event("tc-abc", "exa_search"),
        _json_delta_event(tool_args[:10]),
        _json_delta_event(tool_args[10:]),
        _block_stop_event(),
    ]
    stream_ctx = _FakeStreamContext(events)

    with patch("app.core.providers.claude_stream_fn_provider.anthropic") as mock_anthropic:
        mock_client = MagicMock()
        mock_anthropic.AsyncAnthropic.return_value = mock_client
        mock_anthropic.APIError = Exception
        mock_client.messages.stream.return_value = stream_ctx

        stream_fn = make_claude_stream_fn("claude-sonnet-4-5")
        msgs: list[AgentMessage] = [UserMessage(role="user", content="Search for news")]
        collected = [ev async for ev in stream_fn(msgs, [])]

    tool_events = [e for e in collected if e["type"] == "tool_call"]
    done_events = [e for e in collected if e["type"] == "done"]

    assert len(tool_events) == 1
    assert tool_events[0]["name"] == "exa_search"
    assert tool_events[0]["arguments"] == {"query": "latest AI news"}
    assert tool_events[0]["tool_call_id"] == "tc-abc"

    assert len(done_events) == 1
    assert done_events[0]["stop_reason"] == "tool_use"


# ---------------------------------------------------------------------------
# make_claude_stream_fn — API error path
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_stream_fn_api_error() -> None:
    class FakeAPIError(Exception):
        pass

    async def bad_stream(*_: Any, **__: Any) -> None:
        raise FakeAPIError("rate limited")

    # We need the context manager to raise on __aenter__
    class _ErrorStreamCtx:
        async def __aenter__(self) -> None:
            raise FakeAPIError("rate limited")

        async def __aexit__(self, *_: Any) -> None:
            pass

    with patch("app.core.providers.claude_stream_fn_provider.anthropic") as mock_anthropic:
        mock_client = MagicMock()
        mock_anthropic.AsyncAnthropic.return_value = mock_client
        mock_anthropic.APIError = FakeAPIError
        mock_client.messages.stream.return_value = _ErrorStreamCtx()

        stream_fn = make_claude_stream_fn("claude-sonnet-4-5")
        msgs: list[AgentMessage] = [UserMessage(role="user", content="Hi")]
        collected = [ev async for ev in stream_fn(msgs, [])]

    done_events = [e for e in collected if e["type"] == "done"]
    assert len(done_events) == 1
    assert done_events[0]["stop_reason"] == "error"
    assert "rate limited" in done_events[0]["content"][0]["text"]


# ---------------------------------------------------------------------------
# ClaudeStreamFnProvider — smoke test
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_provider_stream_delegates_to_agent_loop() -> None:
    """Provider.stream() should translate text_delta AgentEvents → StreamEvents."""

    async def fake_agent_loop(*_: Any, **__: Any) -> AsyncIterator[dict]:
        yield {"type": "text_delta", "text": "Hi from Claude"}
        yield {"type": "agent_end", "messages": []}

    with patch(
        "app.core.providers.claude_stream_fn_provider.agent_loop",
        side_effect=fake_agent_loop,
    ):
        with patch("app.core.providers.claude_stream_fn_provider.anthropic"):
            provider = ClaudeStreamFnProvider("claude-sonnet-4-5")
            events = [
                e
                async for e in provider.stream(
                    "Hello", __import__("uuid").uuid4(), __import__("uuid").uuid4()
                )
            ]

    delta_events = [e for e in events if e["type"] == "delta"]
    assert len(delta_events) == 1
    assert delta_events[0]["content"] == "Hi from Claude"
