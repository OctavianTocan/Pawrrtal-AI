"""Sigil helpers for the Gemini :class:`StreamFn` (streaming generations)."""

from __future__ import annotations

import json
import logging
from datetime import UTC, datetime
from typing import Any

from sigil_sdk import (
    GenerationStart,
    Message,
    MessageRole,
    ModelRef,
    TokenUsage,
    ToolCall,
    assistant_text_message,
    text_part,
    tool_call_part,
    tool_result_message,
    user_text_message,
)

from app.core.agent_loop.types import AgentMessage

_logger = logging.getLogger(__name__)


def gemini_usage_to_token_usage(meta: object) -> TokenUsage:
    """Map Gemini ``usage_metadata`` to :class:`TokenUsage` for Sigil export."""
    cache_read = int(getattr(meta, "cached_content_token_count", 0) or 0)
    return TokenUsage(
        input_tokens=int(getattr(meta, "prompt_token_count", 0) or 0),
        output_tokens=int(getattr(meta, "candidates_token_count", 0) or 0),
        total_tokens=int(getattr(meta, "total_token_count", 0) or 0),
        cache_read_input_tokens=cache_read,
        cache_write_input_tokens=0,
        cache_creation_input_tokens=0,
        reasoning_tokens=int(getattr(meta, "thoughts_token_count", 0) or 0),
    )


def _assistant_history_text(m: AgentMessage) -> str:
    blocks = m.get("content")
    if not isinstance(blocks, list):
        return ""
    return " ".join(
        str(b.get("text", "")) for b in blocks if isinstance(b, dict) and b.get("type") == "text"
    )


def _tool_result_plain_text(m: AgentMessage) -> str:
    parts = m.get("content")
    if not isinstance(parts, list) or not parts:
        return ""
    first = parts[0]
    if not isinstance(first, dict):
        return ""
    if first.get("type") != "text":
        return ""
    return str(first.get("text", ""))


def messages_to_sigil_input(messages: list[AgentMessage]) -> list[Message]:
    """Convert agent messages to Sigil :class:`Message` list (text-oriented)."""
    out: list[Message] = []
    for m in messages:
        role = m.get("role", "")
        if role == "user":
            out.append(user_text_message(str(m.get("content", ""))))
            continue
        if role == "assistant":
            text = _assistant_history_text(m)
            if text.strip():
                out.append(assistant_text_message(text))
            continue
        if role == "toolResult":
            tcid = str(m.get("tool_call_id", ""))
            out.append(tool_result_message(tcid, _tool_result_plain_text(m)))
    return out


def build_assistant_output_message(
    full_text: str,
    tool_calls: list[dict[str, Any]],
) -> Message:
    """Build the assistant :class:`Message` with text and tool-call parts."""
    parts: list[Any] = []
    if full_text.strip():
        parts.append(text_part(full_text))
    for tc in tool_calls:
        payload = json.dumps(tc.get("arguments", {})).encode("utf-8")
        parts.append(
            tool_call_part(
                ToolCall(
                    name=str(tc.get("name", "")),
                    id=str(tc.get("tool_call_id", "")),
                    input_json=payload,
                ),
            ),
        )
    return Message(role=MessageRole.ASSISTANT, parts=parts)


def make_generation_start(
    model_id: str,
    conversation_id: str,
    *,
    operation_name: str = "streamText",
) -> GenerationStart:
    """Build :class:`GenerationStart` for a Gemini streaming call."""
    return GenerationStart(
        conversation_id=conversation_id,
        operation_name=operation_name,
        model=ModelRef(provider="google", name=model_id),
        tags={
            "pipeline": "gemini-agent-loop",
            "layer": "provider",
        },
    )


def log_recorder_err(prefix: str, recorder: object) -> None:
    """Emit a warning when ``rec.err()`` is set after a recorder closes."""
    err_fn = getattr(recorder, "err", None)
    if err_fn is None:
        return
    err = err_fn()
    if err is not None:
        _logger.warning("%s: %s", prefix, err)


def maybe_note_first_token(recorder: object, *, marked: list[bool]) -> None:
    """Record first-token time once for TTFT metrics."""
    if marked[0]:
        return
    setter = getattr(recorder, "set_first_token_at", None)
    if setter is None:
        return
    setter(datetime.now(UTC))
    marked[0] = True
