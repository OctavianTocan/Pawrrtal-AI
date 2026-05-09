"""Scenario-based harness tests for agent_loop.

Philosophy — "reverse eval":
    We evaluate the harness under scripted model conditions rather than
    evaluating the model.  Each test defines a realistic sequence of LLM
    decisions (tool calls, text responses, stream errors) and runs them
    through the real agent_loop with real tool execution, real safety
    enforcement, and real retry logic.  The only fake is the LLM itself.

    This is the same pattern as ``langchain-replay`` / ``pytest-agentcontract``
    / Agentspan's ``mock_run`` — script the model's *decisions*, let the
    harness handle everything else for real.

Why our StreamFn seam is ideal:
    ``StreamFn: (messages, tools) -> AsyncIterator[LLMEvent]``
    is exactly the injection point for scripted model outputs.  No HTTP
    interception, no SDK patching, no external libraries needed.

Scenarios covered:
    1. Runaway tool-call loop → hits max_iterations at exactly the right count
    2. Consecutive LLM stream errors → fires after N failures, not N-1 or N+1
    3. Consecutive tool errors → fires when tool always fails
    4. Clean multi-turn conversation → safety does NOT fire
    5. Safety layer resets between clean and dirty runs (counter isolation)
    6. Wall-clock budget (fast-path with near-zero budget)
    7. Mixed: transient error then recovery → resets counter, loop continues
"""

from __future__ import annotations

import asyncio
from collections.abc import AsyncIterator
from dataclasses import dataclass, field
from typing import Any
from uuid import uuid4

import pytest

from app.core.agent_loop import (
    AgentContext,
    AgentEvent,
    AgentLoopConfig,
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
# Scenario building blocks
# ---------------------------------------------------------------------------


def _text_turn(text: str = "Done.") -> list[LLMEvent]:
    """A model turn that returns plain text and stops."""
    return [
        LLMTextDeltaEvent(type="text_delta", text=text),
        LLMDoneEvent(
            type="done",
            stop_reason="stop",
            content=[TextContent(type="text", text=text)],
        ),
    ]


def _tool_call_turn(
    name: str,
    args: dict[str, Any] | None = None,
    turn_id: int = 0,
) -> list[LLMEvent]:
    """A model turn that requests a single tool call.

    The loop sees stop_reason="tool_use" and loops back for the next
    turn — exactly what a stuck-in-a-loop model does.
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


def _error_turn() -> Exception:
    """Sentinel: this turn should raise a provider exception."""
    return RuntimeError("provider unavailable")


# ---------------------------------------------------------------------------
# ScriptedStreamFn
# ---------------------------------------------------------------------------


@dataclass
class ScriptedStreamFn:
    """Plays back a scripted sequence of model decisions.

    Each entry in ``turns`` is either:
    - ``list[LLMEvent]``  — events to yield for that invocation
    - ``Exception``       — to raise, simulating a provider failure

    If the loop calls us more times than there are scripted turns, we
    return an empty ``stop`` (model decided to stop) so the loop exits
    cleanly rather than raising.  This avoids obscuring safety assertions
    with StopIteration noise.
    """

    turns: list[list[LLMEvent] | Exception]
    call_count: int = field(default=0, init=False)

    async def __call__(
        self,
        messages: list[Any],
        tools: list[AgentTool],
    ) -> AsyncIterator[LLMEvent]:
        idx = self.call_count
        self.call_count += 1

        if idx >= len(self.turns):
            # Exhausted script: model stops cleanly.
            yield LLMDoneEvent(type="done", stop_reason="stop", content=[])
            return

        turn = self.turns[idx]

        if isinstance(turn, Exception):
            raise turn

        for event in turn:
            yield event


# ---------------------------------------------------------------------------
# Helpers: build context + run
# ---------------------------------------------------------------------------


def _make_echo_tool() -> AgentTool:
    """A simple tool that echoes its input.  Always succeeds."""

    async def execute(tool_call_id: str, *, value: str = "echo") -> str:
        return f"echoed: {value}"

    return AgentTool(
        name="echo",
        description="Echoes a value back.",
        parameters={
            "type": "object",
            "properties": {"value": {"type": "string"}},
            "required": [],
        },
        execute=execute,
    )


def _make_failing_tool() -> AgentTool:
    """A tool that always raises an exception (is_error=True)."""

    async def execute(tool_call_id: str, **_: Any) -> str:
        raise RuntimeError("disk full")

    return AgentTool(
        name="failing_tool",
        description="Always fails.",
        parameters={"type": "object", "properties": {}, "required": []},
        execute=execute,
    )


def _identity_convert(messages: list[Any]) -> list[Any]:
    return messages


async def _run_scenario(
    turns: list[list[LLMEvent] | Exception],
    safety: AgentSafetyConfig,
    tools: list[AgentTool] | None = None,
) -> list[AgentEvent]:
    """Run a scripted scenario through the real agent_loop.

    Returns the full list of emitted AgentEvents.  Tools execute for
    real; safety fires for real; retry logic fires for real.
    """
    stream_fn = ScriptedStreamFn(turns=turns)
    context = AgentContext(
        system_prompt="You are a test agent.",
        messages=[],
        tools=tools or [],
    )
    prompt = UserMessage(role="user", content="Run the scenario.")
    config = AgentLoopConfig(
        convert_to_llm=_identity_convert,
        safety=safety,
    )

    events: list[AgentEvent] = []
    async for event in agent_loop([prompt], context, config, stream_fn):
        events.append(event)
    return events


def _terminated(events: list[AgentEvent]) -> list[AgentEvent]:
    return [e for e in events if e["type"] == "agent_terminated"]


def _turn_starts(events: list[AgentEvent]) -> list[AgentEvent]:
    return [e for e in events if e["type"] == "turn_start"]


# ---------------------------------------------------------------------------
# Scenarios
# ---------------------------------------------------------------------------

# A model that never stops calling the same tool — classic runaway loop.
# We script 30 identical turns; safety should stop it well before that.
RUNAWAY_LOOP_TURNS = [
    _tool_call_turn("echo", {"value": f"iteration-{i}"}, turn_id=i)
    for i in range(30)
]

# A model that makes 3 successful calls then returns text cleanly.
CLEAN_MULTI_TURN = [
    _tool_call_turn("echo", {"value": "step-1"}, turn_id=0),
    _tool_call_turn("echo", {"value": "step-2"}, turn_id=1),
    _tool_call_turn("echo", {"value": "step-3"}, turn_id=2),
    _text_turn("All steps completed."),
]

# A provider that always fails — stream errors on every call.
ALWAYS_ERROR_TURNS: list[list[LLMEvent] | Exception] = [
    _error_turn() for _ in range(10)
]

# One transient failure followed by recovery.
TRANSIENT_ERROR_THEN_RECOVERY: list[list[LLMEvent] | Exception] = [
    _error_turn(),
    _text_turn("Recovered successfully."),
]


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------


@pytest.mark.anyio
async def test_runaway_tool_loop_terminates_at_max_iterations() -> None:
    """A model stuck in a tool-call loop is stopped at exactly max_iterations.

    This is the primary use case for the safety layer: the model calls
    a tool on every turn and never stops.  With max_iterations=5 and a
    30-turn script, safety should fire at turn 5 — not 4, not 6.

    The echo tool actually executes on each iteration so the harness
    behaves exactly as in production.
    """
    safety = AgentSafetyConfig(
        max_iterations=5,
        max_wall_clock_seconds=None,
        max_consecutive_llm_errors=None,
        max_consecutive_tool_errors=None,
    )
    events = await _run_scenario(RUNAWAY_LOOP_TURNS, safety, tools=[_make_echo_tool()])

    terminated = _terminated(events)
    assert len(terminated) == 1, "Expected exactly one termination event"
    assert terminated[0]["reason"] == "max_iterations"
    assert terminated[0]["details"]["limit"] == 5
    assert terminated[0]["details"]["observed"] == 5

    # Exactly 5 tool-call iterations ran before safety fired.
    # Each full turn emits: turn_start(1) + tool_call_start + tool_call_end
    #   + tool_result + turn_end.  We count turn_starts as proxy.
    starts = _turn_starts(events)
    assert len(starts) == 5, f"Expected 5 turn_starts, got {len(starts)}"


@pytest.mark.anyio
async def test_clean_multi_turn_does_not_fire_safety() -> None:
    """A well-behaved agent (3 tool turns then stop) does not trip safety.

    Confirms the safety layer only fires on actual runaways, not on
    legitimate multi-step turns that are within the configured limits.
    """
    safety = AgentSafetyConfig(
        max_iterations=10,
        max_wall_clock_seconds=None,
        max_consecutive_llm_errors=None,
        max_consecutive_tool_errors=None,
    )
    events = await _run_scenario(CLEAN_MULTI_TURN, safety, tools=[_make_echo_tool()])

    terminated = _terminated(events)
    assert terminated == [], f"Safety should not fire; got: {terminated}"

    agent_end = [e for e in events if e["type"] == "agent_end"]
    assert len(agent_end) == 1


@pytest.mark.anyio
async def test_consecutive_llm_errors_terminate_after_n_failures() -> None:
    """Consecutive provider stream failures terminate after exactly N errors.

    The backoff is disabled (llm_retry_backoff_seconds=0) so the test
    runs fast.  What we're proving: the counter increments on each
    failure and fires at exactly max_consecutive_llm_errors, not one
    before or after.
    """
    safety = AgentSafetyConfig(
        max_iterations=None,
        max_wall_clock_seconds=None,
        max_consecutive_llm_errors=3,
        max_consecutive_tool_errors=None,
        llm_retry_backoff_seconds=0.0,
    )
    events = await _run_scenario(ALWAYS_ERROR_TURNS, safety)

    terminated = _terminated(events)
    assert len(terminated) == 1
    assert terminated[0]["reason"] == "consecutive_llm_errors"
    assert terminated[0]["details"]["limit"] == 3
    assert terminated[0]["details"]["observed"] == 3


@pytest.mark.anyio
async def test_consecutive_tool_errors_terminate_after_n_failures() -> None:
    """Consecutive tool failures terminate after exactly max_consecutive_tool_errors.

    The model correctly requests the tool on each turn (no LLM error),
    but the tool always raises.  After N failures the safety fires with
    reason="consecutive_tool_errors".  Tool errors and LLM errors are
    tracked with separate counters — this test proves the tool counter
    works independently.
    """
    # Script: 10 tool-call turns (all call failing_tool).
    failing_turns = [
        _tool_call_turn("failing_tool", turn_id=i) for i in range(10)
    ]
    safety = AgentSafetyConfig(
        max_iterations=None,
        max_wall_clock_seconds=None,
        max_consecutive_llm_errors=None,
        max_consecutive_tool_errors=4,
    )
    events = await _run_scenario(
        failing_turns, safety, tools=[_make_failing_tool()]
    )

    terminated = _terminated(events)
    assert len(terminated) == 1
    assert terminated[0]["reason"] == "consecutive_tool_errors"
    assert terminated[0]["details"]["limit"] == 4
    assert terminated[0]["details"]["observed"] == 4


@pytest.mark.anyio
async def test_transient_llm_error_then_recovery_does_not_terminate() -> None:
    """A single provider failure followed by success does not trip safety.

    The consecutive error counter must reset to 0 after any successful
    stream.  This ensures transient provider blips (network hiccup,
    rate limit) don't accumulate across turns and silently trip the cap.
    """
    safety = AgentSafetyConfig(
        max_iterations=None,
        max_wall_clock_seconds=None,
        max_consecutive_llm_errors=3,
        max_consecutive_tool_errors=None,
        llm_retry_backoff_seconds=0.0,
    )
    events = await _run_scenario(TRANSIENT_ERROR_THEN_RECOVERY, safety)

    terminated = _terminated(events)
    assert terminated == [], f"One error then recovery should not terminate; got: {terminated}"

    agent_end = [e for e in events if e["type"] == "agent_end"]
    assert len(agent_end) == 1


@pytest.mark.anyio
async def test_tool_error_counter_resets_on_success() -> None:
    """Tool error counter resets when a tool call succeeds.

    Script: 2 failing calls, then 1 successful call, then 2 more
    failing calls.  With max_consecutive_tool_errors=3, this should
    NOT fire — the counter resets to 0 after the success in the middle.
    If the counter did NOT reset, it would observe 4 errors (2+2) and
    incorrectly terminate.
    """
    mixed_turns: list[list[LLMEvent] | Exception] = [
        _tool_call_turn("failing_tool", turn_id=0),
        _tool_call_turn("failing_tool", turn_id=1),
        _tool_call_turn("echo", {"value": "ok"}, turn_id=2),   # resets counter
        _tool_call_turn("failing_tool", turn_id=3),
        _tool_call_turn("failing_tool", turn_id=4),
        _text_turn("Done."),
    ]
    safety = AgentSafetyConfig(
        max_iterations=None,
        max_wall_clock_seconds=None,
        max_consecutive_llm_errors=None,
        max_consecutive_tool_errors=3,
    )
    events = await _run_scenario(
        mixed_turns,
        safety,
        tools=[_make_echo_tool(), _make_failing_tool()],
    )

    terminated = _terminated(events)
    assert terminated == [], (
        "Counter should have reset after the successful echo call; "
        f"got termination: {terminated}"
    )


@pytest.mark.anyio
async def test_wall_clock_fires_on_budget_exceeded() -> None:
    """Wall-clock budget terminates the loop before the next turn starts.

    We set max_wall_clock_seconds=0.0 (already exceeded on entry) and
    max_iterations=None so only the wall-clock guard can fire.  The
    scenario scripts a clean multi-turn run that would succeed without
    the budget — proving it's the wall-clock check and not an iteration
    or error limit.
    """
    safety = AgentSafetyConfig(
        max_iterations=None,
        max_wall_clock_seconds=0.0,
        max_consecutive_llm_errors=None,
        max_consecutive_tool_errors=None,
    )
    events = await _run_scenario(CLEAN_MULTI_TURN, safety, tools=[_make_echo_tool()])

    terminated = _terminated(events)
    assert len(terminated) == 1
    assert terminated[0]["reason"] == "max_wall_clock"


@pytest.mark.anyio
async def test_max_iterations_zero_fires_before_first_llm_call() -> None:
    """max_iterations=0 terminates before touching the StreamFn at all.

    The ScriptedStreamFn tracks call_count.  This test proves that with
    max_iterations=0, the stream is never invoked — the safety check
    fires at the pre-turn gate before we even try to call the model.
    """
    stream_fn = ScriptedStreamFn(turns=RUNAWAY_LOOP_TURNS)
    context = AgentContext(
        system_prompt="test",
        messages=[],
        tools=[],
    )
    safety = AgentSafetyConfig(
        max_iterations=0,
        max_wall_clock_seconds=None,
        max_consecutive_llm_errors=None,
        max_consecutive_tool_errors=None,
    )
    config = AgentLoopConfig(convert_to_llm=_identity_convert, safety=safety)
    prompt = UserMessage(role="user", content="go")

    events: list[AgentEvent] = []
    async for event in agent_loop([prompt], context, config, stream_fn):
        events.append(event)

    terminated = _terminated(events)
    assert len(terminated) == 1
    assert terminated[0]["reason"] == "max_iterations"
    # The StreamFn was never called — model was never contacted.
    assert stream_fn.call_count == 0, (
        f"StreamFn should not have been called with max_iterations=0, "
        f"but call_count={stream_fn.call_count}"
    )


@pytest.mark.anyio
async def test_safety_disabled_allows_many_iterations() -> None:
    """AgentSafetyConfig.disabled() lets a long run complete without intervention.

    30-turn runaway script with all guards off.  The loop must exhaust
    the script and exit cleanly (agent_end, no agent_terminated).
    This is the escape hatch for trusted long-running automations.
    """
    events = await _run_scenario(
        RUNAWAY_LOOP_TURNS,
        AgentSafetyConfig.disabled(),
        tools=[_make_echo_tool()],
    )

    terminated = _terminated(events)
    assert terminated == [], f"No termination expected with safety disabled; got {terminated}"

    agent_end = [e for e in events if e["type"] == "agent_end"]
    assert len(agent_end) == 1
