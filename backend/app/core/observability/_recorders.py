"""Span recorder classes for ``app.core.observability.workshop``.

Holds the mutable per-span state (streamed deltas, buffered tool calls,
final usage) that the ``llm_span`` / ``tool_span`` context managers
stamp onto their OTel spans.  Split out so the public ``workshop``
module stays inside the project's file-line budget
(``scripts/check-file-lines.mjs``); private to the package.
"""

from __future__ import annotations

from typing import Any

from opentelemetry.trace import Span, Status, StatusCode

from app.core.observability._schema import (
    ATTR_GENAI_COST_USD,
    ATTR_GENAI_FINISH_REASONS,
    ATTR_GENAI_INPUT_TOKENS,
    ATTR_GENAI_OUTPUT_MESSAGES,
    ATTR_GENAI_OUTPUT_TOKENS,
    ATTR_GENAI_RESPONSE_MODEL,
    ATTR_OTEL_STATUS_MESSAGE,
    ATTR_TRACELOOP_OUTPUT,
    EVENT_ATTR_CONTENT_TEXT,
    EVENT_ATTR_THINKING_TEXT,
    EVENT_CONTENT_DELTA,
    EVENT_THINKING_DELTA,
    json_dumps,
)


class LLMSpanRecorder:
    """Accumulates streamed deltas + final usage onto the live LLM span.

    Workshop's adapter reads ``gen_ai.output.messages`` once the span
    closes, so we buffer the text + tool-call parts in memory and
    stamp the attribute on ``flush()``.  Per-delta events also go on
    the span as OTel span events so Workshop's live websocket
    broadcast surfaces them while the turn is still running.

    The recorder is intentionally tolerant of partial input — each
    method short-circuits on an empty payload so a misbehaving
    provider stream can't crash observability.
    """

    def __init__(self, span: Span, *, model_id: str) -> None:
        """Bind the recorder to *span* and remember the model id."""
        self._span = span
        self._model_id = model_id
        self._text_parts: list[str] = []
        self._thinking_parts: list[str] = []
        self._tool_calls: list[dict[str, Any]] = []
        self._finalised = False

    def record_text_delta(self, text: str) -> None:
        """Append a streamed text chunk and emit a span event."""
        if not text:
            return
        self._text_parts.append(text)
        self._span.add_event(EVENT_CONTENT_DELTA, {EVENT_ATTR_CONTENT_TEXT: text})

    def record_thinking_delta(self, text: str) -> None:
        """Append a streamed reasoning chunk and emit a span event."""
        if not text:
            return
        self._thinking_parts.append(text)
        self._span.add_event(EVENT_THINKING_DELTA, {EVENT_ATTR_THINKING_TEXT: text})

    def record_tool_call(
        self,
        *,
        tool_call_id: str,
        name: str,
        arguments: dict[str, Any],
    ) -> None:
        """Buffer a tool-call part for the final ``gen_ai.output.messages``."""
        self._tool_calls.append(
            {
                "type": "tool_call",
                "id": tool_call_id,
                "name": name,
                "arguments": arguments,
            }
        )

    def record_usage(
        self,
        *,
        input_tokens: int,
        output_tokens: int,
        cost_usd: float | None,
    ) -> None:
        """Stamp the terminal usage block onto the span."""
        self._span.set_attribute(ATTR_GENAI_INPUT_TOKENS, int(input_tokens))
        self._span.set_attribute(ATTR_GENAI_OUTPUT_TOKENS, int(output_tokens))
        if cost_usd is not None:
            self._span.set_attribute(ATTR_GENAI_COST_USD, float(cost_usd))

    def record_stop(self, stop_reason: str) -> None:
        """Stamp the terminal stop reason (``"stop"``, ``"tool_use"``, ...)."""
        if not stop_reason:
            return
        self._span.set_attribute(ATTR_GENAI_FINISH_REASONS, json_dumps([stop_reason]))

    def record_error(self, message: str) -> None:
        """Mark the span as errored and stamp the message.

        Called by ``llm_span``'s ``except`` clause; tests may call it
        directly to verify the error path without raising.
        """
        self._span.set_status(Status(StatusCode.ERROR, message))
        self._span.set_attribute(ATTR_OTEL_STATUS_MESSAGE, message)

    def flush(self) -> None:
        """Stamp ``gen_ai.output.messages`` + ``gen_ai.response.model``.

        Idempotent — the LLM span context-manager calls this in its
        ``finally`` block so an exception path still gets a partial
        output stamped (the text accumulated up to the failure).
        """
        if self._finalised:
            return
        self._finalised = True
        parts: list[dict[str, Any]] = []
        if self._text_parts:
            parts.append({"type": "text", "content": "".join(self._text_parts)})
        parts.extend(self._tool_calls)
        self._span.set_attribute(ATTR_GENAI_RESPONSE_MODEL, self._model_id)
        self._span.set_attribute(
            ATTR_GENAI_OUTPUT_MESSAGES,
            json_dumps([{"role": "assistant", "parts": parts}]),
        )


class ToolSpanRecorder:
    """Stamps the tool result onto its span at finish time."""

    def __init__(self, span: Span) -> None:
        """Bind the recorder to *span*."""
        self._span = span

    def record_result(self, result: Any, *, is_error: bool) -> None:
        """Stamp ``traceloop.entity.output`` and propagate error status."""
        self._span.set_attribute(ATTR_TRACELOOP_OUTPUT, json_dumps(result))
        if is_error:
            self._span.set_status(Status(StatusCode.ERROR))
            self._span.set_attribute(ATTR_OTEL_STATUS_MESSAGE, str(result))

    def record_error(self, message: str) -> None:
        """Mark the span as errored and stamp the message as the output."""
        self._span.set_status(Status(StatusCode.ERROR, message))
        self._span.set_attribute(ATTR_OTEL_STATUS_MESSAGE, message)
        self._span.set_attribute(
            ATTR_TRACELOOP_OUTPUT,
            json_dumps({"error": message}),
        )
