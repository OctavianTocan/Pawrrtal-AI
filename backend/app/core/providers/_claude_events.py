"""Translate Claude Agent SDK ``Message`` instances into ``StreamEvent`` dicts.

Pure projection: SDK message types in, ``StreamEvent`` dicts out.  Lives
in its own module so :mod:`app.core.providers.claude_provider` stays
under the project's 500-line file budget — the events surface is large
enough on its own (``AssistantMessage``, ``UserMessage``,
``ResultMessage``, ``RateLimitEvent``, ``SystemMessage``) that splitting
it pays for itself in readability too.

Dispatch is **table-based** rather than a chain of ``isinstance`` arms,
so each translator stays under the project's 3-level nesting budget
without paying for the indirection ``functools.singledispatch`` would
add.  All public names (the underscore-prefixed helpers below) are
re-exported from ``claude_provider`` so existing import sites and tests
keep working.
"""

from __future__ import annotations

import logging
from collections.abc import Callable, Iterator
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
    """Translate a single Claude SDK ``Message`` into zero or more ``StreamEvent``s.

    Dispatches on the message type through ``_MESSAGE_HANDLERS`` so the
    body stays at one level of nesting; each handler is a module-level
    helper that owns its own surface.
    """
    handler = _MESSAGE_HANDLERS.get(type(message))
    if handler is None:
        return
    yield from handler(message)


def _events_from_assistant(message: AssistantMessage) -> Iterator[StreamEvent]:
    """Project an assistant message's content blocks into ``StreamEvent``s."""
    for block in message.content:
        event = _event_from_block(block)
        if event is not None:
            yield event
    if message.error:
        yield _error_event(f"Assistant message reported an error: {message.error}")


def _events_from_user(message: UserMessage) -> Iterator[StreamEvent]:
    """``UserMessage`` in the live stream carries tool results.

    Surface the tool roundtrip so the frontend can render it; ignore
    plain echo blocks.
    """
    if not isinstance(message.content, list):
        return
    for block in message.content:
        if isinstance(block, ToolResultBlock):
            yield _tool_result_event(block)


def _events_from_result(message: ResultMessage) -> Iterator[StreamEvent]:
    """Surface SDK-level errors carried on the terminating ``ResultMessage``."""
    if not message.is_error:
        return
    # Log alongside yielding so the failure shows up in
    # ``backend/app.log`` too.  Previously the only signal was the
    # SSE error panel in the browser, which made tool failures like
    # ``error_max_turns`` invisible to anyone reading backend logs to
    # debug.  Logged at WARNING because the connection is still
    # alive — the chat surface recovers and the user can retry.
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


def _events_from_rate_limit(message: RateLimitEvent) -> Iterator[StreamEvent]:
    """Surface rejection-status rate limits as user-visible errors."""
    if message.rate_limit_info.status == "rejected":
        yield _error_event("Claude API rate limit reached. Please wait and retry.")


def _events_from_system(_message: SystemMessage) -> Iterator[StreamEvent]:
    """``SystemMessage`` carries CLI metadata; not user-visible by default."""
    return
    yield  # pragma: no cover — keeps the function a generator for the dispatch table


# ---------------------------------------------------------------------------
# Block-level translation
# ---------------------------------------------------------------------------


def _block_to_text(block: TextBlock) -> StreamEvent:
    return StreamEvent(type="delta", content=block.text)


def _block_to_thinking(block: ThinkingBlock) -> StreamEvent:
    return StreamEvent(type="thinking", content=block.thinking)


def _block_to_tool_use(block: ToolUseBlock) -> StreamEvent:
    return StreamEvent(
        type="tool_use",
        name=block.name,
        input=block.input,
        tool_use_id=block.id,
    )


def _event_from_block(block: object) -> StreamEvent | None:
    """Dispatch a single content-block instance to its translator.

    Returns ``None`` for unknown block types so the caller can skip
    them without growing a branch.
    """
    handler = _BLOCK_HANDLERS.get(type(block))
    if handler is None:
        return None
    return handler(block)


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
        return "\n".join(_render_content_item(item) for item in content)
    return str(content)


def _render_content_item(item: object) -> str:
    """Render a single element of a ``ToolResultBlock.content`` list."""
    if not isinstance(item, dict):
        return str(item)
    # Anthropic's tool-result format uses ``{"type": "text", "text": "..."}``.
    if item.get("type") == "text" and isinstance(item.get("text"), str):
        return item["text"]
    return str(item)


def _error_event(message: str) -> StreamEvent:
    return StreamEvent(type="error", content=message)


# ---------------------------------------------------------------------------
# Dispatch tables (declared at the bottom so the handlers above are bound)
# ---------------------------------------------------------------------------

_MessageHandler = Callable[[Any], Iterator[StreamEvent]]
_BlockHandler = Callable[[Any], StreamEvent]

_MESSAGE_HANDLERS: dict[type, _MessageHandler] = {
    AssistantMessage: _events_from_assistant,
    UserMessage: _events_from_user,
    ResultMessage: _events_from_result,
    RateLimitEvent: _events_from_rate_limit,
    SystemMessage: _events_from_system,
}

_BLOCK_HANDLERS: dict[type, _BlockHandler] = {
    TextBlock: _block_to_text,
    ThinkingBlock: _block_to_thinking,
    ToolUseBlock: _block_to_tool_use,
    ToolResultBlock: _tool_result_event,
}
