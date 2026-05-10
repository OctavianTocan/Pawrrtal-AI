"""Sigil helpers for Claude Agent SDK streaming (:class:`STREAM` generations)."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from sigil_sdk import GenerationStart, ModelRef, user_text_message

from app.core.providers.base import StreamEvent
from app.core.telemetry.sigil_gemini import (
    build_assistant_output_message,
    log_recorder_err,
    maybe_note_first_token,
)


@dataclass
class ClaudeSigilAccum:
    """Mutable capture for one Claude ``stream()`` call."""

    full_text_chunks: list[str] = field(default_factory=list)
    tool_calls: list[dict[str, Any]] = field(default_factory=list)
    had_stream_error: bool = False


def make_claude_generation_start(model_id: str, conversation_id: str) -> GenerationStart:
    """Build :class:`GenerationStart` for Claude Agent SDK streaming."""
    return GenerationStart(
        conversation_id=conversation_id,
        operation_name="streamText",
        model=ModelRef(provider="anthropic", name=model_id),
        tags={
            "pipeline": "claude-agent-sdk",
            "layer": "provider",
        },
    )


def apply_claude_stream_event_for_sigil(
    event: StreamEvent,
    sigil_rec: object,
    *,
    first_mark: list[bool],
    accum: ClaudeSigilAccum,
) -> None:
    """Update Sigil streaming state from one emitted :class:`StreamEvent`."""
    et = event.get("type", "")
    if et == "delta":
        maybe_note_first_token(sigil_rec, marked=first_mark)
        accum.full_text_chunks.append(event.get("content", "") or "")
        return
    if et == "tool_use":
        raw_in = event.get("input")
        args = raw_in if isinstance(raw_in, dict) else {}
        accum.tool_calls.append(
            {
                "tool_call_id": str(event.get("tool_use_id", "")),
                "name": str(event.get("name", "")),
                "arguments": args,
            },
        )
        return
    if et == "error":
        accum.had_stream_error = True


def finalize_claude_streaming_generation(
    sigil_rec: object,
    *,
    question: str,
    response_model: str,
    accum: ClaudeSigilAccum,
) -> None:
    """Call ``set_result`` after the Claude query iterator completes."""
    full_text = "".join(accum.full_text_chunks)
    stop_reason = (
        "error" if accum.had_stream_error else ("tool_use" if accum.tool_calls else "stop")
    )
    sigil_rec.set_result(
        input=[user_text_message(question)],
        output=[build_assistant_output_message(full_text, accum.tool_calls)],
        stop_reason=stop_reason,
        response_model=response_model,
    )
    log_recorder_err("Sigil Claude stream generation", sigil_rec)
