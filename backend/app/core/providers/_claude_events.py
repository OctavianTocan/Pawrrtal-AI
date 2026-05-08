"""Translate Claude Agent SDK ``Message`` instances into ``StreamEvent`` dicts.

Pure projection: SDK message types in, ``StreamEvent`` dicts out.  Lives
in its own module so :mod:`app.core.providers.claude_provider` stays
under the project's 500-line file budget — the events surface is large
enough on its own (``AssistantMessage``, ``UserMessage``,
``ResultMessage``, ``RateLimitEvent``, ``SystemMessage``) that splitting
it pays for itself in readability too.

No I/O, no SDK calls — just dispatch and shape conversion.  All public
names (the underscore-prefixed helpers below) are re-exported from
``claude_provider`` so existing import sites and tests keep working.
"""

from __future__ import annotations

import logging
from collections.abc import Iterator
from typing import Any

from claude_agent_sdk import (
    AssistantMessage,
    RateLimitEvent,
    ResultMessage,
    SystemMessage,
    TextBlock,
    ThinkingBlock,
    ToolResultBlock,
    ToolUseBlock,
    UserMessage,
)

from .base import StreamEvent

logger = logging.getLogger(__name__)


def _events_from_message(message: Any) -> Iterator[StreamEvent]:
    """Translate a single Claude SDK ``Message`` into zero or more ``StreamEvent``s."""
    if isinstance(message, AssistantMessage):
        yield from _events_from_assistant(message)
        return
    if isinstance(message, UserMessage):
        # ``UserMessage`` in the stream represents tool results being fed
        # back to the model. Surface those so the frontend can render the
        # tool roundtrip; ignore plain echoes.
        if isinstance(message.content, list):
            for block in message.content:
                if isinstance(block, ToolResultBlock):
                    yield _tool_result_event(block)
        return
    if isinstance(message, ResultMessage):
        if message.is_error:
            # Log alongside yielding so the failure shows up in
            # `backend/app.log` too. Previously the only signal was the
            # SSE error panel in the browser, which made tool failures
            # like ``error_max_turns`` invisible to anyone reading
            # backend logs to debug. Logged at WARNING because the
            # connection is still alive — the chat surface recovers and
            # the user can retry.
            logger.warning(
                "Claude SDK ResultMessage reported error: "
                "stop_reason=%r subtype=%r duration_ms=%s num_turns=%s",
                message.stop_reason,
                message.subtype,
                getattr(message, "duration_ms", None),
                getattr(message, "num_turns", None),
            )
            yield _error_event(
                "Claude SDK result reported an error. "
                f"stop_reason={message.stop_reason!r} subtype={message.subtype!r}"
            )
        return
    if isinstance(message, RateLimitEvent):
        info = message.rate_limit_info
        if info.status == "rejected":
            yield _error_event("Claude API rate limit reached. Please wait and retry.")
        return
    if isinstance(message, SystemMessage):
        # System messages carry CLI metadata (init details, mirror errors,
        # task progress, etc.). Not user-visible by default.
        return


def _events_from_assistant(message: AssistantMessage) -> Iterator[StreamEvent]:
    """Project an assistant message's content blocks into ``StreamEvent``s."""
    for block in message.content:
        if isinstance(block, TextBlock):
            yield StreamEvent(type="delta", content=block.text)
        elif isinstance(block, ThinkingBlock):
            yield StreamEvent(type="thinking", content=block.thinking)
        elif isinstance(block, ToolUseBlock):
            yield StreamEvent(
                type="tool_use",
                name=block.name,
                input=block.input,
                tool_use_id=block.id,
            )
        elif isinstance(block, ToolResultBlock):
            yield _tool_result_event(block)
    if message.error:
        yield _error_event(f"Assistant message reported an error: {message.error}")


def _tool_result_event(block: ToolResultBlock) -> StreamEvent:
    return StreamEvent(
        type="tool_result",
        tool_use_id=block.tool_use_id,
        content=_tool_result_to_text(block.content),
    )


def _tool_result_to_text(content: object) -> str:
    """Render ``ToolResultBlock.content`` as plain text for the SSE event."""
    if content is None:
        return ""
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        parts: list[str] = []
        for item in content:
            if isinstance(item, dict):
                # Anthropic's tool-result format uses ``{"type": "text", "text": "..."}``.
                if item.get("type") == "text" and isinstance(item.get("text"), str):
                    parts.append(item["text"])
                else:
                    parts.append(str(item))
            else:
                parts.append(str(item))
        return "\n".join(parts)
    return str(content)


def _error_event(message: str) -> StreamEvent:
    return StreamEvent(type="error", content=message)
