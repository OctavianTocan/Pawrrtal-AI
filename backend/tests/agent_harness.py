"""Shared scripted-trajectory test infrastructure for agent_loop harness tests.

Philosophy — "reverse eval":
    Evaluate the harness under scripted model conditions, not the model
    itself.  Each test defines a realistic sequence of LLM decisions
    (tool calls, text responses, stream errors) and runs them through the
    real agent_loop with real tool execution, real safety enforcement, and
    real retry logic.  The only fake is the LLM.

Usage:
    from tests.agent_harness import (
        ScriptedStreamFn,
        echo_tool,
        failing_tool,
        identity_convert,
        text_turn,
        tool_call_turn,
        error_turn,
    )

    stream = ScriptedStreamFn(turns=[
        tool_call_turn("echo", {"value": "step-1"}),
        text_turn("Done."),
    ])
    provider = GeminiLLM("gemini-test")
    monkeypatch.setattr(provider, "_stream_fn", stream)

Rule: Every new test that exercises agent_loop harness behavior (safety,
tool execution, retry, event translation) MUST use ScriptedStreamFn.
Using bare AsyncMock or hand-rolled generators for multi-turn scenarios
is a code smell — migrate them here.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from app.core.agent_loop import (
    AgentContext,
    AgentEvent,
    AgentLoopConfig,
    AgentMessage,
    AgentSafetyConfig,
    AgentTool,
    LLMEvent,
    UserMessage,
    agent_loop,
)
from app.core.agent_loop.types import (
    LLMDoneEvent,
    LLMTextDeltaEvent,
    LLMToolCallEvent,
    TextContent,
    ToolCallContent,
)


# ---------------------------------------------------------------------------
# Turn builders — construct realistic LLMEvent sequences
# ---------------------------------------------------------------------------


def text_turn(text: str = "Done.") -> list[LLMEvent]:
    """A model turn that returns plain text and signals stop."""
    return [
        LLMTextDeltaEvent(type="text_delta", text=text),
        LLMDoneEvent(
            type="done",
            stop_reason="stop",
            content=[TextContent(type="text", text=text)],
        ),
    ]


def tool_call_turn(
    name: str,
    args: dict[str, Any] | None = None,
    turn_id: int = 0,
) -> list[LLMEvent]:
    """A model turn that requests a single tool call.

    ``stop_reason="tool_use"`` causes agent_loop to execute the tool and
    loop back for the next turn — exactly what a stuck-in-a-loop model does.
    """
    args = args or {}
    tc_id = f"call-{name}-{turn_id}"
    return [
        LLMToolCallEvent(
            type="tool_call",
            tool_call_id=tc_id,
            name=name,
            arguments=args,
        ),
        LLMDoneEvent(
            type="done",
            stop_reason="tool_use",
            content=[
                ToolCallContent(
                    type="toolCall",
                    tool_call_id=tc_id,
                    name=name,
                    arguments=args,
                )
            ],
        ),
    ]


def error_turn() -> Exception:
    """Sentinel: this turn should raise a provider exception.

    Pass as an element in ``ScriptedStreamFn.turns`` to simulate a
    transient or persistent LLM provider failure.
    """
    return RuntimeError("provider unavailable")


# ---------------------------------------------------------------------------
# ScriptedStreamFn
# ---------------------------------------------------------------------------


@dataclass
class ScriptedStreamFn:
    """Plays back a scripted sequence of model decisions as a StreamFn.

    Each entry in ``turns`` is either:
    - ``list[LLMEvent]``  — events to yield for that invocation
    - ``Exception``       — to raise, simulating a provider failure

    If the loop calls us more times than there are scripted turns we
    yield an empty stop event so the loop exits cleanly rather than
    raising.  This keeps safety assertions clean: you specify exactly
    the scenario, and the loop terminates normally when the script ends.

    Attributes:
        turns: The scripted turn sequence.
        call_count: Incremented on every invocation; use to assert
            that the StreamFn was / was not called.
    """

    turns: list[list[LLMEvent] | Exception]
    call_count: int = field(default=0, init=False)

    async def __call__(
        self,
        messages: list[AgentMessage],
        tools: list[AgentTool],
    ):
        idx = self.call_count
        self.call_count += 1

        if idx >= len(self.turns):
            # Script exhausted: model stops cleanly.
            yield LLMDoneEvent(type="done", stop_reason="stop", content=[])
            return

        turn = self.turns[idx]

        if isinstance(turn, Exception):
            raise turn

        for event in turn:
            yield event


# ---------------------------------------------------------------------------
# AgentTool builders
# ---------------------------------------------------------------------------


def echo_tool(name: str = "echo") -> AgentTool:
    """An AgentTool that echoes its ``value`` kwarg back.  Always succeeds."""

    async def execute(tool_call_id: str, *, value: str = "echo", **_: Any) -> str:
        return f"echoed: {value}"

    return AgentTool(
        name=name,
        description="Echoes a value back.",
        parameters={
            "type": "object",
            "properties": {"value": {"type": "string"}},
            "required": [],
        },
        execute=execute,
    )


def failing_tool(name: str = "failing_tool") -> AgentTool:
    """An AgentTool that always raises a RuntimeError (is_error=True)."""

    async def execute(tool_call_id: str, **_: Any) -> str:
        raise RuntimeError("disk full")

    return AgentTool(
        name=name,
        description="Always fails.",
        parameters={"type": "object", "properties": {}, "required": []},
        execute=execute,
    )


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def identity_convert(messages: list[AgentMessage]) -> list[AgentMessage]:
    """Pass through only roles the LLM understands."""
    return [m for m in messages if m["role"] in {"user", "assistant", "toolResult"}]


async def run_scenario(
    turns: list[list[LLMEvent] | Exception],
    safety: AgentSafetyConfig,
    tools: list[AgentTool] | None = None,
    question: str = "Run the scenario.",
) -> list[AgentEvent]:
    """Run a scripted scenario through the real agent_loop.

    Returns the full list of emitted AgentEvents.  Tool execution, safety
    enforcement, and retry logic all run for real.

    Args:
        turns: The scripted LLM decision sequence.
        safety: Safety configuration to apply.
        tools: Optional list of AgentTools to make available.
        question: The user prompt to inject (content doesn't matter for
            harness tests, but something realistic helps readability).

    Returns:
        All AgentEvents emitted by the loop, in order.
    """
    stream_fn = ScriptedStreamFn(turns=turns)
    context = AgentContext(
        system_prompt="You are a test agent.",
        messages=[],
        tools=tools or [],
    )
    prompt = UserMessage(role="user", content=question)
    config = AgentLoopConfig(
        convert_to_llm=identity_convert,
        safety=safety,
    )
    return [ev async for ev in agent_loop([prompt], context, config, stream_fn)]
