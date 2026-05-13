"""Types for the Pi-inspired agent loop.

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
    """A single text segment inside structured message content."""

    type: Literal["text"]
    text: str


class ToolCallContent(TypedDict):
    """A tool invocation requested by the assistant."""

    type: Literal["toolCall"]
    tool_call_id: str
    name: str
    arguments: dict[str, Any]


class ToolResultContent(TypedDict):
    """Plain text returned to the model after a tool executes."""

    type: Literal["text"]
    text: str


# ---------------------------------------------------------------------------
# Agent-level messages (what the loop accumulates)
# ---------------------------------------------------------------------------


class UserMessage(TypedDict):
    """End-user utterance in agent history."""

    role: Literal["user"]
    content: str


class AssistantMessage(TypedDict):
    """Assistant turn including optional tool calls."""

    role: Literal["assistant"]
    content: list[TextContent | ToolCallContent]
    stop_reason: str  # "stop" | "tool_use" | "error" | "aborted"


class ToolResultMessage(TypedDict):
    """Structured tool output fed back into the conversation."""

    role: Literal["toolResult"]
    tool_call_id: str
    content: list[ToolResultContent]
    is_error: bool


AgentMessage = UserMessage | AssistantMessage | ToolResultMessage


# ---------------------------------------------------------------------------
# LLM-level events (what StreamFn implementations yield)
# ---------------------------------------------------------------------------


class LLMTextDeltaEvent(TypedDict):
    """Incremental text chunk from a streaming provider."""

    type: Literal["text_delta"]
    text: str


class LLMToolCallEvent(TypedDict):
    """Tool call emitted by the LLM stream."""

    type: Literal["tool_call"]
    tool_call_id: str
    name: str
    arguments: dict[str, Any]


class LLMDoneEvent(TypedDict):
    """Final LLM stream frame with assembled content."""

    type: Literal["done"]
    stop_reason: str
    content: list[TextContent | ToolCallContent]


LLMEvent = LLMTextDeltaEvent | LLMToolCallEvent | LLMDoneEvent


# ---------------------------------------------------------------------------
# Agent-level events (what agent_loop() yields to callers)
# ---------------------------------------------------------------------------


class AgentStartEvent(TypedDict):
    """Signals the beginning of an agent_loop run."""

    type: Literal["agent_start"]


class TurnStartEvent(TypedDict):
    """A new assistant turn is starting."""

    type: Literal["turn_start"]


class MessageStartEvent(TypedDict):
    """Assistant began composing a message."""

    type: Literal["message_start"]
    message: AgentMessage


class MessageEndEvent(TypedDict):
    """Assistant finished a message (tool calls or final text)."""

    type: Literal["message_end"]
    message: AgentMessage


class TextDeltaEvent(TypedDict):
    """Text delta surfaced to channel consumers."""

    type: Literal["text_delta"]
    text: str


class ToolCallStartEvent(TypedDict):
    """Tool invocation started (streaming args may follow)."""

    type: Literal["tool_call_start"]
    tool_call_id: str
    name: str


class ToolCallEndEvent(TypedDict):
    """Tool invocation fully specified (name + arguments)."""

    type: Literal["tool_call_end"]
    tool_call_id: str
    name: str
    arguments: dict[str, Any]


class ToolResultEvent(TypedDict):
    """Result string for a completed tool call."""

    type: Literal["tool_result"]
    tool_call_id: str
    content: str
    is_error: bool


class TurnEndEvent(TypedDict):
    """Assistant turn completed; includes pending tool results."""

    type: Literal["turn_end"]
    message: AssistantMessage
    tool_results: list[ToolResultMessage]


class AgentEndEvent(TypedDict):
    """agent_loop finished normally with full message history."""

    type: Literal["agent_end"]
    messages: list[AgentMessage]


class AgentTerminatedEvent(TypedDict):
    """Emitted when the safety layer trips and the loop bails early.

    ``reason`` is a stable machine-readable string — callers (the chat
    router, tests, the frontend) match against it to render the
    appropriate user-facing notice.  ``details`` carries human-readable
    context (e.g. ``{"limit": 25, "observed": 25}``) for logs and the
    error message surfaced to the user.
    """

    type: Literal["agent_terminated"]
    reason: Literal[
        "max_iterations",
        "max_wall_clock",
        "consecutive_llm_errors",
        "consecutive_tool_errors",
    ]
    details: dict[str, Any]
    message: str


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
    | AgentTerminatedEvent
)


# ---------------------------------------------------------------------------
# Tool definition
# ---------------------------------------------------------------------------


@dataclass
class AgentTool:
    """A callable tool the agent can invoke.

    ``execute`` receives the tool_call_id and keyword arguments matching
    the JSON schema parameters.  It must return a string result.
    """

    name: str
    description: str
    parameters: dict[str, Any]  # JSON schema object
    execute: Callable[..., Coroutine[Any, Any, str]]


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


@dataclass(frozen=True)
class AgentSafetyConfig:
    """Hard limits that prevent runaway agent loops.

    Every field accepts ``None`` to opt out of that specific guard.
    Defaults are conservative — they catch real runaways (model stuck in
    a tool loop, transient API errors retried forever, mis-configured
    workflow eating wall-clock) while leaving generous room for normal
    long agent turns (research, multi-step refactors).

    Tavi can disable any of these in `Settings` when running an agent
    that legitimately needs longer.  Set ``None`` to disable a specific
    guard; set the whole field to ``AgentSafetyConfig.disabled()`` to
    opt out entirely (escape hatch for trusted automations).

    Inspired by openclaw/openclaw#9912 (maxTurns/maxToolCalls),
    PR #38812 (tool-only safety valve), and issue #52147 (separating
    LLM-pending vs tool-executing timeout semantics).
    """

    #: Hard cap on assistant turns (LLM→tool→LLM round-trips) per
    #: ``agent_loop`` invocation.  ``None`` disables.  Default 25 covers
    #: deep research / refactor turns; runaway tool-call loops trip well
    #: before this.
    max_iterations: int | None = 25

    #: Wall-clock budget for the whole loop, in seconds.  Counted from
    #: the moment ``agent_loop`` is entered.  ``None`` disables.
    #: Default 300s (5 min) is generous for chat turns and matches the
    #: 600s cap minus headroom for streaming / network jitter.
    max_wall_clock_seconds: float | None = 300.0

    #: How many back-to-back stream errors (provider exception, network
    #: drop) we tolerate before bailing.  Resets on a successful stream.
    #: ``None`` disables retry-bail — a single error then immediately
    #: aborts.  Default 3.
    max_consecutive_llm_errors: int | None = 3

    #: How many back-to-back tool failures (``is_error=True`` results)
    #: we tolerate before bailing.  Resets on any successful tool call.
    #: Distinct from LLM errors so a flaky tool doesn't compound with a
    #: flaky model.  ``None`` disables.  Default 5.
    max_consecutive_tool_errors: int | None = 5

    #: Base backoff (seconds) between LLM retries; doubled each retry.
    #: First retry waits ``backoff``, second ``2*backoff``, etc.
    #: 0 disables backoff (retries fire immediately).
    llm_retry_backoff_seconds: float = 1.0

    @classmethod
    def disabled(cls) -> AgentSafetyConfig:
        """Return a config with every guard turned off.

        Use sparingly — only for trusted automation that genuinely needs
        unbounded loop time.  The chat path should always use the default
        config or a mildly relaxed variant.
        """
        return cls(
            max_iterations=None,
            max_wall_clock_seconds=None,
            max_consecutive_llm_errors=None,
            max_consecutive_tool_errors=None,
            llm_retry_backoff_seconds=0.0,
        )


@dataclass
class AgentLoopConfig:
    """Configuration for a single agent_loop invocation.

    convert_to_llm: required — filters/converts AgentMessage[] to the
        subset the LLM provider understands (strips UI-only messages).
    transform_context: optional — async function that prunes or compresses
        the message list before every LLM call (e.g. sliding window).
    should_stop_after_turn: optional — sync predicate; return True to stop
        the loop after the current turn even if more tool calls are pending.
    safety: hard limits on iterations, wall-clock, retries, etc.  See
        :class:`AgentSafetyConfig`.  Defaults are conservative and
        appropriate for the chat path.
    """

    convert_to_llm: Callable[[list[AgentMessage]], list[AgentMessage]]
    transform_context: TransformContextFn | None = None
    should_stop_after_turn: ShouldStopFn | None = None
    safety: AgentSafetyConfig = field(default_factory=AgentSafetyConfig)
