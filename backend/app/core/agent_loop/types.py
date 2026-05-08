"""
Types for the Pi-inspired agent loop.

Architecture mirrors @mariozechner/pi-agent-core from pi-mono:
  https://github.com/badlogic/pi-mono/blob/main/packages/agent/src/types.ts

Key separation:
  - AgentMessage: what the loop works with (can include UI-only messages)
  - LLMEvent: what providers emit while streaming
  - AgentEvent: what the loop emits to callers
"""

from __future__ import annotations

from collections.abc import AsyncIterator, Callable, Coroutine
from dataclasses import dataclass, field
from typing import Any, Literal, TypedDict


# ---------------------------------------------------------------------------
# Content blocks (inside messages)
# ---------------------------------------------------------------------------


class TextContent(TypedDict):
    type: Literal["text"]
    text: str


class ToolCallContent(TypedDict):
    type: Literal["toolCall"]
    tool_call_id: str
    name: str
    arguments: dict[str, Any]


class ToolResultContent(TypedDict):
    type: Literal["text"]
    text: str


# ---------------------------------------------------------------------------
# Agent-level messages (what the loop accumulates)
# ---------------------------------------------------------------------------


class UserMessage(TypedDict):
    role: Literal["user"]
    content: str


class AssistantMessage(TypedDict):
    role: Literal["assistant"]
    content: list[TextContent | ToolCallContent]
    stop_reason: str  # "stop" | "tool_use" | "error" | "aborted"


class ToolResultMessage(TypedDict):
    role: Literal["toolResult"]
    tool_call_id: str
    content: list[ToolResultContent]
    is_error: bool


AgentMessage = UserMessage | AssistantMessage | ToolResultMessage


# ---------------------------------------------------------------------------
# LLM-level events (what StreamFn implementations yield)
# ---------------------------------------------------------------------------


class LLMTextDeltaEvent(TypedDict):
    type: Literal["text_delta"]
    text: str


class LLMToolCallEvent(TypedDict):
    type: Literal["tool_call"]
    tool_call_id: str
    name: str
    arguments: dict[str, Any]


class LLMDoneEvent(TypedDict):
    type: Literal["done"]
    stop_reason: str
    content: list[TextContent | ToolCallContent]


LLMEvent = LLMTextDeltaEvent | LLMToolCallEvent | LLMDoneEvent


# ---------------------------------------------------------------------------
# Agent-level events (what agent_loop() yields to callers)
# ---------------------------------------------------------------------------


class AgentStartEvent(TypedDict):
    type: Literal["agent_start"]


class TurnStartEvent(TypedDict):
    type: Literal["turn_start"]


class MessageStartEvent(TypedDict):
    type: Literal["message_start"]
    message: AgentMessage


class MessageEndEvent(TypedDict):
    type: Literal["message_end"]
    message: AgentMessage


class TextDeltaEvent(TypedDict):
    type: Literal["text_delta"]
    text: str


class ToolCallStartEvent(TypedDict):
    type: Literal["tool_call_start"]
    tool_call_id: str
    name: str


class ToolCallEndEvent(TypedDict):
    type: Literal["tool_call_end"]
    tool_call_id: str
    name: str
    arguments: dict[str, Any]


class ToolResultEvent(TypedDict):
    type: Literal["tool_result"]
    tool_call_id: str
    content: str
    is_error: bool


class TurnEndEvent(TypedDict):
    type: Literal["turn_end"]
    message: AssistantMessage
    tool_results: list[ToolResultMessage]


class AgentEndEvent(TypedDict):
    type: Literal["agent_end"]
    messages: list[AgentMessage]


AgentEvent = (
    AgentStartEvent
    | TurnStartEvent
    | MessageStartEvent
    | MessageEndEvent
    | TextDeltaEvent
    | ToolCallStartEvent
    | ToolCallEndEvent
    | ToolResultEvent
    | TurnEndEvent
    | AgentEndEvent
)


# ---------------------------------------------------------------------------
# Tool definition
# ---------------------------------------------------------------------------


@dataclass
class AgentTool:
    """A callable tool the agent can invoke.

    ``execute`` receives the tool_call_id and keyword arguments matching
    the JSON schema parameters.  It must return a string result.

    ``category`` is a coarse risk class consumed by the permission gate
    in :mod:`app.core.permissions`.  Defaults to ``"write"`` so that a
    tool author who forgets to set it is treated as the most restrictive
    case in low-permission modes (fail closed).  String type, not the
    ``ToolCategory`` enum, to keep this module dependency-free for the
    Pi-style agent loop.
    """

    name: str
    description: str
    parameters: dict[str, Any]  # JSON schema object
    execute: Callable[..., Coroutine[Any, Any, str]]
    category: str = "write"


# ---------------------------------------------------------------------------
# Agent context and loop config
# ---------------------------------------------------------------------------


@dataclass
class AgentContext:
    """Shared state passed into and mutated by the agent loop."""

    system_prompt: str
    messages: list[AgentMessage]
    tools: list[AgentTool] = field(default_factory=list)


# StreamFn: what each provider implements.
# Takes messages (after transform + convert) and tools; yields LLMEvents.
StreamFn = Callable[
    [list[AgentMessage], list[AgentTool]],
    AsyncIterator[LLMEvent],
]

# TransformContextFn: prune/summarise messages before the LLM call.
TransformContextFn = Callable[
    [list[AgentMessage]],
    Coroutine[Any, Any, list[AgentMessage]],
]

# ShouldStopFn: return True to exit after the current turn.
ShouldStopFn = Callable[[AgentContext], bool]


@dataclass
class AgentLoopConfig:
    """Configuration for a single agent_loop invocation.

    convert_to_llm: required — filters/converts AgentMessage[] to the
        subset the LLM provider understands (strips UI-only messages).
    transform_context: optional — async function that prunes or compresses
        the message list before every LLM call (e.g. sliding window).
    should_stop_after_turn: optional — sync predicate; return True to stop
        the loop after the current turn even if more tool calls are pending.
    """

    convert_to_llm: Callable[[list[AgentMessage]], list[AgentMessage]]
    transform_context: TransformContextFn | None = None
    should_stop_after_turn: ShouldStopFn | None = None
