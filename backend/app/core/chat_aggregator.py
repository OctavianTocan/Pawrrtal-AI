"""Aggregate provider stream events into the rich shape the chat UI persists.

@fileoverview Mirrors the frontend reducer in
``frontend/features/chat/chat-reducer.ts`` so a stream produces identical
state on the client (live) and on the server (persisted). One instance of
:class:`ChatTurnAggregator` lives for the duration of a single assistant
turn; the chat endpoint feeds it every :class:`StreamEvent` and writes the
final snapshot into the ``chat_messages`` row when the stream ends.
"""

from __future__ import annotations

import time
from dataclasses import dataclass, field
from typing import Any

from app.core.providers.base import StreamEvent


@dataclass
class _ToolCall:
    id: str
    name: str
    input: dict[str, Any]
    status: str = "pending"
    result: str | None = None

    def to_dict(self) -> dict[str, Any]:
        """Serialise to the JSON shape persisted in the chat_messages row."""
        payload: dict[str, Any] = {
            "id": self.id,
            "name": self.name,
            "input": self.input,
            "status": self.status,
        }
        if self.result is not None:
            payload["result"] = self.result
        return payload


@dataclass
class ChatTurnAggregator:
    """Fold provider stream events into the persisted assistant-turn shape.

    The aggregator is intentionally state-machine-light: it just appends to a
    few lists/strings. All semantics (e.g. which timeline entries merge) match
    the frontend reducer so live and rehydrated views are byte-identical.
    """

    content: str = ""
    thinking: str = ""
    started_at_monotonic: float | None = None
    error_text: str | None = None
    tool_calls: list[_ToolCall] = field(default_factory=list)
    timeline: list[dict[str, Any]] = field(default_factory=list)

    def _mark_started(self) -> None:
        if self.started_at_monotonic is None:
            self.started_at_monotonic = time.monotonic()

    def _push_thinking_entry(self, text: str) -> None:
        """Coalesce consecutive thinking chunks into a single timeline entry."""
        if self.timeline and self.timeline[-1].get("kind") == "thinking":
            self.timeline[-1]["text"] = self.timeline[-1].get("text", "") + text
            return
        self.timeline.append({"kind": "thinking", "text": text})

    def apply(self, event: StreamEvent) -> None:
        """Fold one provider event into the running snapshot."""
        event_type = event.get("type")
        if event_type == "delta":
            self._mark_started()
            self.content += event.get("content", "") or ""
            return
        if event_type == "thinking":
            self._mark_started()
            chunk = event.get("content", "") or ""
            self.thinking += chunk
            self._push_thinking_entry(chunk)
            return
        if event_type == "tool_use":
            self._mark_started()
            tool_use_id = str(event.get("tool_use_id", ""))
            self.tool_calls.append(
                _ToolCall(
                    id=tool_use_id,
                    name=str(event.get("name", "")),
                    input=dict(event.get("input", {}) or {}),
                )
            )
            self.timeline.append({"kind": "tool", "toolCallId": tool_use_id})
            return
        if event_type == "tool_result":
            tool_use_id = str(event.get("tool_use_id", ""))
            for call in self.tool_calls:
                if call.id == tool_use_id:
                    call.result = event.get("content")
                    call.status = "completed"
                    break
            return
        if event_type == "error":
            self.error_text = event.get("content") or "Chat stream failed."

    def duration_seconds(self) -> int:
        """Whole-second elapsed time since the first delta/thinking/tool event."""
        if self.started_at_monotonic is None:
            return 0
        elapsed = time.monotonic() - self.started_at_monotonic
        return max(0, round(elapsed))

    def to_persisted_shape(self, *, status: str) -> dict[str, Any]:
        """Snapshot in the shape ``finalize_assistant_message`` expects."""
        # Use error_text as the rendered content on failed turns so the UI gets
        # the same "Error: ..." string it would have shown live.
        if status == "failed" and self.error_text and not self.content:
            content = f"Error: {self.error_text}"
        else:
            content = self.content
        return {
            "content": content,
            "thinking": self.thinking or None,
            "tool_calls": [call.to_dict() for call in self.tool_calls] or None,
            "timeline": list(self.timeline) or None,
            "thinking_duration_seconds": self.duration_seconds() or None,
            "assistant_status": status,
        }
