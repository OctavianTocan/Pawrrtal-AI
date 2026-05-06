"""Claude provider — StreamFn adapter for the agent loop.

Mirrors the structure of ``gemini_provider.py``: a ``make_claude_stream_fn()``
factory builds a ``StreamFn`` backed by the raw Anthropic Python SDK, and
``ClaudeStreamFnProvider`` wires it into ``agent_loop()`` so every provider
shares the same turn lifecycle.

Unlike ``ClaudeProvider`` (which delegates to the Claude Code CLI via
``claude_agent_sdk``), this provider calls the Anthropic Messages API
directly.  That means:

- Full streaming with ``AsyncAnthropic.messages.stream()``.
- Tool calls accumulated from ``input_json_delta`` chunks — same pattern the
  Anthropic docs recommend.
- History injected per-turn from ``AgentContext.messages`` rather than
  relying on CLI session transcripts.

Design decisions that mirror ``gemini_provider.py``:
- ``make_claude_stream_fn(model_id)`` is a closure so it can be unit-tested
  independently of the full provider class.
- ``_build_anthropic_messages()`` converts ``AgentMessage`` list to the dict
  format the Anthropic API expects (role + content).
- ``_build_anthropic_tools()`` converts ``AgentTool`` → Anthropic tool schema.
- ``ClaudeStreamFnProvider.stream()`` translates ``AgentEvent``→``StreamEvent``
  using the same projection as ``GeminiProvider``.
"""
from __future__ import annotations

import json
import uuid
from collections.abc import AsyncIterator
from typing import Any

import anthropic

from app.core.agent_loop import (
    AgentContext,
    AgentLoopConfig,
    AgentMessage,
    AgentTool,
    LLMDoneEvent,
    LLMEvent,
    LLMTextDeltaEvent,
    LLMToolCallEvent,
    StreamFn,
    UserMessage,
    agent_loop,
)
from app.core.config import settings

from .base import AIProvider, StreamEvent

_SYSTEM_PROMPT = (
    "You are a helpful AI assistant inside the AI Nexus chat application. "
    "Be concise, accurate, and thoughtful in your responses."
)

_MAX_TOKENS = 8096

_ANTHROPIC_ROLE = {"user": "user", "assistant": "assistant"}


# ---------------------------------------------------------------------------
# Message / tool converters
# ---------------------------------------------------------------------------


def _build_anthropic_messages(
    messages: list[AgentMessage],
) -> list[dict[str, Any]]:
    """Convert ``AgentMessage`` list to Anthropic Messages API format.

    Rules:
    - ``user`` / ``assistant`` roles map 1-to-1.
    - ``toolResult`` messages become a ``user`` turn with a
      ``tool_result`` content block — the format the API expects.
    - Empty or whitespace-only text messages are skipped to avoid API errors.
    """
    result: list[dict[str, Any]] = []

    for msg in messages:
        role = msg.get("role", "")

        if role == "user":
            text = msg.get("content", "")
            if isinstance(text, str) and text.strip():
                result.append({"role": "user", "content": text})

        elif role == "assistant":
            content = msg.get("content", [])
            if isinstance(content, str):
                if content.strip():
                    result.append({"role": "assistant", "content": content})
            elif isinstance(content, list):
                blocks: list[dict[str, Any]] = []
                for block in content:
                    btype = block.get("type", "")
                    if btype == "text":
                        blocks.append({"type": "text", "text": block.get("text", "")})
                    elif btype == "toolCall":
                        blocks.append(
                            {
                                "type": "tool_use",
                                "id": block.get("tool_call_id", ""),
                                "name": block.get("name", ""),
                                "input": block.get("arguments", {}),
                            }
                        )
                if blocks:
                    result.append({"role": "assistant", "content": blocks})

        elif role == "toolResult":
            tool_call_id = msg.get("tool_call_id", "")
            content_list = msg.get("content", [])
            text_parts = [
                c.get("text", "") for c in content_list if c.get("type") == "text"
            ]
            result.append(
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "tool_result",
                            "tool_use_id": tool_call_id,
                            "content": "\n".join(text_parts),
                            "is_error": msg.get("is_error", False),
                        }
                    ],
                }
            )

    return result


def _build_anthropic_tools(tools: list[AgentTool]) -> list[dict[str, Any]]:
    """Convert ``AgentTool`` list to Anthropic tool definitions."""
    return [
        {
            "name": t.name,
            "description": t.description,
            "input_schema": t.parameters,
        }
        for t in tools
    ]


# ---------------------------------------------------------------------------
# StreamFn factory
# ---------------------------------------------------------------------------


def make_claude_stream_fn(model_id: str) -> StreamFn:
    """Build a ``StreamFn`` backed by the Anthropic Messages streaming API.

    The returned async generator:
    1. Converts ``AgentMessage`` → Anthropic message dicts.
    2. Streams from ``AsyncAnthropic.messages.stream()``.
    3. Yields ``LLMTextDeltaEvent`` for each text chunk.
    4. Accumulates ``input_json_delta`` chunks to reconstruct tool call
       arguments, then emits ``LLMToolCallEvent`` on ``content_block_stop``.
    5. Emits ``LLMDoneEvent`` with ``stop_reason`` and full content list.
    """
    client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)

    async def stream_fn(
        messages: list[AgentMessage],
        tools: list[AgentTool],
    ) -> AsyncIterator[LLMEvent]:
        anthropic_messages = _build_anthropic_messages(messages)
        anthropic_tools = _build_anthropic_tools(tools)

        # Per-stream accumulators
        full_text = ""
        tool_calls: list[dict[str, Any]] = []

        # In-progress tool call state (built up across delta events)
        current_tool: dict[str, Any] | None = None
        current_tool_json_buf: str = ""

        try:
            kwargs: dict[str, Any] = {
                "model": model_id,
                "max_tokens": _MAX_TOKENS,
                "system": _SYSTEM_PROMPT,
                "messages": anthropic_messages,
            }
            if anthropic_tools:
                kwargs["tools"] = anthropic_tools

            async with client.messages.stream(**kwargs) as stream:
                async for event in stream:
                    etype = event.type

                    # --- start of a new content block ---
                    if etype == "content_block_start":
                        block = event.content_block  # type: ignore[attr-defined]
                        if block.type == "tool_use":
                            current_tool = {
                                "tool_call_id": block.id,
                                "name": block.name,
                            }
                            current_tool_json_buf = ""

                    # --- delta within a content block ---
                    elif etype == "content_block_delta":
                        delta = event.delta  # type: ignore[attr-defined]
                        if delta.type == "text_delta":
                            yield LLMTextDeltaEvent(type="text_delta", text=delta.text)
                            full_text += delta.text
                        elif delta.type == "input_json_delta":
                            current_tool_json_buf += delta.partial_json

                    # --- end of a content block ---
                    elif etype == "content_block_stop":
                        if current_tool is not None:
                            try:
                                arguments = (
                                    json.loads(current_tool_json_buf)
                                    if current_tool_json_buf.strip()
                                    else {}
                                )
                            except json.JSONDecodeError:
                                arguments = {"_raw": current_tool_json_buf}

                            tool_call = {
                                "tool_call_id": current_tool["tool_call_id"],
                                "name": current_tool["name"],
                                "arguments": arguments,
                            }
                            yield LLMToolCallEvent(
                                type="tool_call",
                                tool_call_id=tool_call["tool_call_id"],
                                name=tool_call["name"],
                                arguments=arguments,
                            )
                            tool_calls.append(tool_call)
                            current_tool = None
                            current_tool_json_buf = ""

        except anthropic.APIError as exc:
            yield LLMDoneEvent(
                type="done",
                stop_reason="error",
                content=[{"type": "text", "text": f"Anthropic API error: {exc}"}],
            )
            return

        # Determine stop reason and emit done event
        stop_reason = "tool_use" if tool_calls else "stop"

        from app.core.agent_loop.types import TextContent, ToolCallContent

        content: list[TextContent | ToolCallContent] = []
        if full_text:
            content.append(TextContent(type="text", text=full_text))
        for tc in tool_calls:
            content.append(
                ToolCallContent(
                    type="toolCall",
                    tool_call_id=tc["tool_call_id"],
                    name=tc["name"],
                    arguments=tc["arguments"],
                )
            )

        yield LLMDoneEvent(type="done", stop_reason=stop_reason, content=content)

    return stream_fn


# ---------------------------------------------------------------------------
# Provider class
# ---------------------------------------------------------------------------


def _identity_convert(messages: list[AgentMessage]) -> list[AgentMessage]:
    """Pass through messages the Anthropic API understands; strip UI-only types."""
    return [m for m in messages if m["role"] in {"user", "assistant", "toolResult"}]


class ClaudeStreamFnProvider:
    """``AIProvider`` backed by ``agent_loop`` + a Claude ``StreamFn``.

    Matches the interface of ``GeminiProvider`` exactly — same constructor
    signature, same ``stream()`` signature, same ``AgentEvent``→``StreamEvent``
    projection.  The only provider-specific code is in ``make_claude_stream_fn()``.
    """

    def __init__(self, model_id: str) -> None:
        self._model_id = model_id
        self._stream_fn = make_claude_stream_fn(model_id)

    async def stream(
        self,
        question: str,
        conversation_id: uuid.UUID,
        user_id: uuid.UUID,
        history: list[dict[str, str]] | None = None,
    ) -> AsyncIterator[StreamEvent]:
        """Run the agent loop and translate ``AgentEvent``s → ``StreamEvent``s."""
        prior: list[AgentMessage] = [
            AgentMessage(role=m["role"], content=m["content"])  # type: ignore[call-overload]
            for m in (history or [])
            if m.get("role") in {"user", "assistant"}
        ]

        context = AgentContext(
            system_prompt=_SYSTEM_PROMPT,
            messages=prior,
            tools=[],  # TODO: wire Exa + MCP tools here
        )
        prompt = UserMessage(role="user", content=question)
        config = AgentLoopConfig(convert_to_llm=_identity_convert)

        try:
            async for event in agent_loop([prompt], context, config, self._stream_fn):
                etype = event["type"]

                if etype == "text_delta":
                    yield StreamEvent(type="delta", content=event.get("text", ""))  # type: ignore[arg-type]

                elif etype == "tool_call_start":
                    yield StreamEvent(
                        type="tool_use",
                        name=event.get("name", ""),  # type: ignore[arg-type]
                        input={},
                        tool_use_id=event.get("tool_call_id", ""),  # type: ignore[arg-type]
                    )

                elif etype == "tool_result":
                    yield StreamEvent(
                        type="tool_result",
                        content=event.get("content", ""),  # type: ignore[arg-type]
                        tool_use_id=event.get("tool_call_id", ""),  # type: ignore[arg-type]
                    )

                elif etype == "agent_end":
                    pass  # loop complete — chat.py sends [DONE]

        except Exception as exc:
            yield StreamEvent(type="error", content=f"Claude provider error: {exc}")
