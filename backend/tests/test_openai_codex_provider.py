"""Scaffold tests for the OpenAI Codex (ChatGPT OAuth) text provider.

These pin the bits of the new provider that can be verified without
hitting a real Codex backend: request body shape, header set, and SSE
event mapping.  The live streaming path is intentionally unwired —
see ``docs/design/codex-oauth-text-provider.md`` and the provider
module docstring.
"""

from __future__ import annotations

import json
import uuid
from collections.abc import AsyncIterator
from typing import Any

import pytest

from app.core.providers.openai_codex_provider import (
    OpenAICodexLLM,
    _build_headers,
    _build_request_body,
    parse_codex_sse_stream,
)


# ---------------------------------------------------------------------------
# Request body shape
# ---------------------------------------------------------------------------


class TestBuildRequestBody:
    def test_appends_user_question_after_history(self) -> None:
        body = _build_request_body(
            model="gpt-5",
            question="What's the weather?",
            history=[
                {"role": "user", "content": "Hi"},
                {"role": "assistant", "content": "Hello!"},
            ],
            system_prompt=None,
            tools=None,
        )
        roles = [item["role"] for item in body["input"]]
        assert roles == ["user", "assistant", "user"]
        assert body["input"][-1]["content"][0]["text"] == "What's the weather?"

    def test_uses_input_text_parts_not_chat_messages(self) -> None:
        """Responses API requires content as a list of typed parts, NOT chat completions strings."""
        body = _build_request_body(
            model="gpt-5",
            question="hi",
            history=None,
            system_prompt=None,
            tools=None,
        )
        item = body["input"][0]
        assert item["type"] == "message"
        assert isinstance(item["content"], list)
        assert item["content"][0]["type"] == "input_text"

    def test_forces_streaming_and_stateless_storage(self) -> None:
        """Backend rejects non-streaming and rejects ``store: true``."""
        body = _build_request_body(
            model="gpt-5",
            question="hi",
            history=None,
            system_prompt=None,
            tools=None,
        )
        assert body["stream"] is True
        assert body["store"] is False

    def test_includes_reasoning_encrypted_content_for_multi_turn(self) -> None:
        """The flag opts us into stateless multi-turn reasoning replay."""
        body = _build_request_body(
            model="gpt-5",
            question="hi",
            history=None,
            system_prompt=None,
            tools=None,
        )
        assert "reasoning.encrypted_content" in body["include"]

    def test_omits_instructions_when_system_prompt_is_absent(self) -> None:
        body = _build_request_body(
            model="gpt-5",
            question="hi",
            history=None,
            system_prompt=None,
            tools=None,
        )
        assert "instructions" not in body

    def test_includes_instructions_when_system_prompt_provided(self) -> None:
        body = _build_request_body(
            model="gpt-5",
            question="hi",
            history=None,
            system_prompt="You are a helpful assistant.",
            tools=None,
        )
        assert body["instructions"] == "You are a helpful assistant."

    def test_tools_get_passed_through_with_auto_choice(self) -> None:
        tools: list[dict[str, Any]] = [
            {
                "type": "function",
                "name": "read_file",
                "description": "Read a file",
                "parameters": {"type": "object", "properties": {}},
            }
        ]
        body = _build_request_body(
            model="gpt-5",
            question="hi",
            history=None,
            system_prompt=None,
            tools=tools,
        )
        assert body["tools"] == tools
        assert body["tool_choice"] == "auto"

    def test_skips_empty_history_messages(self) -> None:
        body = _build_request_body(
            model="gpt-5",
            question="hi",
            history=[{"role": "user", "content": ""}, {"role": "assistant", "content": "Hey"}],
            system_prompt=None,
            tools=None,
        )
        # The empty message was dropped; only the assistant + the new user remain.
        roles = [item["role"] for item in body["input"]]
        assert roles == ["assistant", "user"]


# ---------------------------------------------------------------------------
# Request headers — these are the strict ones that broke openclaw#64133
# ---------------------------------------------------------------------------


class TestBuildHeaders:
    def test_sets_codex_required_headers(self) -> None:
        h = _build_headers(
            access_token="eyJxxxxx",
            account_id="org-123",
            conversation_id=uuid.UUID("00000000-0000-0000-0000-000000000001"),
        )
        assert h["Authorization"] == "Bearer eyJxxxxx"
        assert h["chatgpt-account-id"] == "org-123"
        assert h["OpenAI-Beta"] == "responses=experimental"
        assert h["Accept"] == "text/event-stream"
        assert h["Content-Type"] == "application/json"

    def test_originator_is_pawrrtal_not_codex_cli_rs(self) -> None:
        """Strict-mode trap: ``codex_cli_rs`` forces exact-prompt validation."""
        h = _build_headers(
            access_token="t",
            account_id="a",
            conversation_id=uuid.UUID("00000000-0000-0000-0000-000000000001"),
        )
        assert h["originator"] == "pawrrtal"
        assert h["originator"] != "codex_cli_rs"

    def test_session_id_is_a_uuid(self) -> None:
        h = _build_headers(
            access_token="t",
            account_id="a",
            conversation_id=uuid.UUID("00000000-0000-0000-0000-000000000001"),
        )
        # Will raise if not a valid UUID.
        uuid.UUID(h["session_id"])

    def test_x_client_request_id_carries_conversation_id(self) -> None:
        conv_id = uuid.uuid4()
        h = _build_headers(access_token="t", account_id="a", conversation_id=conv_id)
        assert h["x-client-request-id"] == str(conv_id)


# ---------------------------------------------------------------------------
# SSE event mapping
# ---------------------------------------------------------------------------


async def _async_lines(lines: list[str]) -> AsyncIterator[str]:
    for line in lines:
        yield line


def _wrap(event_type: str, **fields: Any) -> str:
    return "data: " + json.dumps({"type": event_type, **fields})


@pytest.mark.anyio
async def test_text_deltas_become_delta_events() -> None:
    events: list[dict[str, Any]] = []
    stream = parse_codex_sse_stream(
        _async_lines(
            [
                _wrap("response.created", id="resp_1"),
                _wrap("response.output_text.delta", delta="Hello"),
                _wrap("response.output_text.delta", delta=" world"),
                _wrap("response.completed"),
                "data: [DONE]",
            ]
        )
    )
    async for event in stream:
        events.append(dict(event))
    assert events == [
        {"type": "delta", "content": "Hello"},
        {"type": "delta", "content": " world"},
    ]


@pytest.mark.anyio
async def test_reasoning_summary_deltas_become_thinking_events() -> None:
    events: list[dict[str, Any]] = []
    stream = parse_codex_sse_stream(
        _async_lines(
            [
                _wrap("response.reasoning_summary.delta", delta="Considering"),
                _wrap("response.reasoning_summary.delta", delta=" options."),
                _wrap("response.completed"),
            ]
        )
    )
    async for event in stream:
        events.append(dict(event))
    assert events == [
        {"type": "thinking", "content": "Considering"},
        {"type": "thinking", "content": " options."},
    ]


@pytest.mark.anyio
async def test_function_call_streams_into_tool_use_event() -> None:
    """A function_call item + streamed arguments collapses into a single tool_use."""
    events: list[dict[str, Any]] = []
    stream = parse_codex_sse_stream(
        _async_lines(
            [
                _wrap(
                    "response.output_item.added",
                    item={
                        "type": "function_call",
                        "call_id": "call_abc",
                        "name": "read_file",
                    },
                ),
                _wrap(
                    "response.function_call_arguments.delta",
                    item_id="call_abc",
                    delta='{"path": "/etc/',
                ),
                _wrap(
                    "response.function_call_arguments.delta",
                    item_id="call_abc",
                    delta='hosts"}',
                ),
                _wrap(
                    "response.function_call_arguments.done",
                    item_id="call_abc",
                    name="read_file",
                ),
                _wrap("response.completed"),
            ]
        )
    )
    async for event in stream:
        events.append(dict(event))

    # First event: tool_use shell with empty input (announced when the
    # function_call item starts).  Second: tool_use with the full input
    # parsed from the buffered arguments.
    assert events[0]["type"] == "tool_use"
    assert events[0]["name"] == "read_file"
    assert events[0]["tool_use_id"] == "call_abc"
    assert events[0]["input"] == {}

    assert events[1]["type"] == "tool_use"
    assert events[1]["name"] == "read_file"
    assert events[1]["tool_use_id"] == "call_abc"
    assert events[1]["input"] == {"path": "/etc/hosts"}


@pytest.mark.anyio
async def test_error_event_passes_through_with_message() -> None:
    events: list[dict[str, Any]] = []
    stream = parse_codex_sse_stream(
        _async_lines(
            [
                _wrap("error", error={"message": "rate_limit_exceeded"}),
                _wrap("response.completed"),
            ]
        )
    )
    async for event in stream:
        events.append(dict(event))
    assert events == [{"type": "error", "content": "rate_limit_exceeded"}]


@pytest.mark.anyio
async def test_done_marker_terminates_stream_cleanly() -> None:
    """[DONE] returns from the generator, even before response.completed."""
    events: list[dict[str, Any]] = []
    stream = parse_codex_sse_stream(
        _async_lines(
            [
                _wrap("response.output_text.delta", delta="cut"),
                "data: [DONE]",
                _wrap("response.output_text.delta", delta="ignored"),
            ]
        )
    )
    async for event in stream:
        events.append(dict(event))
    assert events == [{"type": "delta", "content": "cut"}]


@pytest.mark.anyio
async def test_malformed_json_lines_are_skipped() -> None:
    """A line of garbage in the SSE doesn't kill the stream."""
    events: list[dict[str, Any]] = []
    stream = parse_codex_sse_stream(
        _async_lines(
            [
                "data: not valid json",
                _wrap("response.output_text.delta", delta="ok"),
                _wrap("response.completed"),
            ]
        )
    )
    async for event in stream:
        events.append(dict(event))
    assert events == [{"type": "delta", "content": "ok"}]


# ---------------------------------------------------------------------------
# Provider class
# ---------------------------------------------------------------------------


class TestOpenAICodexLLM:
    def test_strips_openai_codex_prefix_from_model_id(self) -> None:
        """``openai-codex/gpt-5`` and ``gpt-5`` both go on the wire as ``gpt-5``."""
        llm = OpenAICodexLLM("openai-codex/gpt-5")
        assert llm.model == "gpt-5"

    def test_keeps_bare_model_id_unchanged(self) -> None:
        llm = OpenAICodexLLM("gpt-5-codex")
        assert llm.model == "gpt-5-codex"

    @pytest.mark.anyio
    async def test_stream_raises_until_activation(self) -> None:
        """Scaffold state: stream() must signal that it's not wired up yet."""
        llm = OpenAICodexLLM("gpt-5")
        gen = llm.stream(
            "hi",
            uuid.uuid4(),
            uuid.uuid4(),
            history=None,
            tools=None,
            system_prompt=None,
        )
        with pytest.raises(NotImplementedError):
            async for _ in gen:
                pass
