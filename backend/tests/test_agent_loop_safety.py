"""Safety-layer tests for the agent loop.

These tests speak the agent loop's StreamFn protocol directly so they
don't need a real provider.  Each scenario constructs a deterministic
fake stream and asserts on the events the loop yields.
"""

from __future__ import annotations

import asyncio
from collections.abc import AsyncIterator

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


def _identity_convert(messages):
    return messages


async def _run(prompts, ctx, cfg, stream_fn) -> list[AgentEvent]:
    return [ev async for ev in agent_loop(prompts, ctx, cfg, stream_fn)]


def _user(text: str) -> UserMessage:
    return UserMessage(role="user", content=text)


# ---------------------------------------------------------------------------
# Stream factories — each returns a StreamFn that yields a fixed script.
# ---------------------------------------------------------------------------


def stream_with_tool_call(tool_name: str, args: dict, call_id: str = "tc-1"):
    async def _fn(_msgs, _tools) -> AsyncIterator[LLMEvent]:
        yield {
            "type": "tool_call",
            "tool_call_id": call_id,
            "name": tool_name,
            "arguments": args,
        }
        yield {
            "type": "done",
            "stop_reason": "tool_use",
            "content": [
                {
                    "type": "toolCall",
                    "tool_call_id": call_id,
                    "name": tool_name,
                    "arguments": args,
                }
            ],
        }

    return _fn


def stream_with_text(text: str):
    async def _fn(_msgs, _tools) -> AsyncIterator[LLMEvent]:
        yield {"type": "text_delta", "text": text}
        yield {
            "type": "done",
            "stop_reason": "stop",
            "content": [{"type": "text", "text": text}],
        }

    return _fn


def stream_raises(exc: Exception):
    async def _fn(_msgs, _tools) -> AsyncIterator[LLMEvent]:
        raise exc
        yield  # pragma: no cover — make this a generator

    return _fn


def stream_raises_then(exc: Exception, fallback_text: str):
    """Raise on first call, then succeed with text."""
    state = {"calls": 0}

    async def _fn(_msgs, _tools) -> AsyncIterator[LLMEvent]:
        state["calls"] += 1
        if state["calls"] == 1:
            raise exc
        yield {"type": "text_delta", "text": fallback_text}
        yield {
            "type": "done",
            "stop_reason": "stop",
            "content": [{"type": "text", "text": fallback_text}],
        }

    return _fn


def make_tool(name: str, *, fail: bool = False) -> AgentTool:
    async def execute(_call_id: str, **_kwargs) -> str:
        if fail:
            raise RuntimeError(f"{name} broke")
        return f"{name} ok"

    return AgentTool(name=name, description="", parameters={}, execute=execute)


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------


@pytest.mark.anyio
async def test_max_iterations_terminates_runaway_tool_loop():
    """A model that calls a tool every turn should bail at the cap."""
    tool = make_tool("ping")
    ctx = AgentContext(system_prompt="", messages=[], tools=[tool])
    cfg = AgentLoopConfig(
        convert_to_llm=_identity_convert,
        safety=AgentSafetyConfig(
            max_iterations=3,
            max_wall_clock_seconds=None,
            max_consecutive_llm_errors=None,
            max_consecutive_tool_errors=None,
        ),
    )

    events = await _run(
        [_user("go")], ctx, cfg, stream_with_tool_call("ping", {})
    )

    terminated = [e for e in events if e["type"] == "agent_terminated"]
    assert len(terminated) == 1
    assert terminated[0]["reason"] == "max_iterations"
    assert terminated[0]["details"]["limit"] == 3
    assert terminated[0]["details"]["observed"] == 3


@pytest.mark.anyio
async def test_max_wall_clock_terminates_long_running_loop():
    """A loop whose budget is already exceeded bails on the next pre-turn check."""
    tool = make_tool("ping")
    ctx = AgentContext(system_prompt="", messages=[], tools=[tool])
    # Tiny budget — the first turn runs (since elapsed=0), then the
    # second pre-turn check sees we've blown it.
    cfg = AgentLoopConfig(
        convert_to_llm=_identity_convert,
        safety=AgentSafetyConfig(
            max_iterations=None,
            max_wall_clock_seconds=0.01,
            max_consecutive_llm_errors=None,
            max_consecutive_tool_errors=None,
        ),
    )

    async def slow_stream(_msgs, _tools):
        await asyncio.sleep(0.05)
        yield {
            "type": "tool_call",
            "tool_call_id": "tc",
            "name": "ping",
            "arguments": {},
        }
        yield {
            "type": "done",
            "stop_reason": "tool_use",
            "content": [
                {
                    "type": "toolCall",
                    "tool_call_id": "tc",
                    "name": "ping",
                    "arguments": {},
                }
            ],
        }

    events = await _run([_user("go")], ctx, cfg, slow_stream)
    terminated = [e for e in events if e["type"] == "agent_terminated"]
    assert len(terminated) == 1
    assert terminated[0]["reason"] == "max_wall_clock"


@pytest.mark.anyio
async def test_consecutive_tool_errors_terminate():
    """N back-to-back tool failures trip the guard."""
    flaky = make_tool("flaky", fail=True)
    ctx = AgentContext(system_prompt="", messages=[], tools=[flaky])
    cfg = AgentLoopConfig(
        convert_to_llm=_identity_convert,
        safety=AgentSafetyConfig(
            max_iterations=None,
            max_wall_clock_seconds=None,
            max_consecutive_llm_errors=None,
            max_consecutive_tool_errors=2,
        ),
    )

    events = await _run(
        [_user("go")], ctx, cfg, stream_with_tool_call("flaky", {})
    )
    terminated = [e for e in events if e["type"] == "agent_terminated"]
    assert len(terminated) == 1
    assert terminated[0]["reason"] == "consecutive_tool_errors"
    assert terminated[0]["details"]["observed"] == 2


@pytest.mark.anyio
async def test_consecutive_tool_errors_reset_on_success():
    """A successful tool call resets the counter."""
    success_tool = make_tool("ok", fail=False)
    fail_tool = make_tool("bad", fail=True)
    ctx = AgentContext(system_prompt="", messages=[], tools=[success_tool, fail_tool])

    # Stream alternates: bad, ok, bad — never two bads in a row.
    state = {"i": 0}
    sequence = ["bad", "ok", "bad"]

    async def alternating(_msgs, _tools):
        i = state["i"]
        state["i"] += 1
        if i >= len(sequence):
            yield {
                "type": "done",
                "stop_reason": "stop",
                "content": [{"type": "text", "text": "done"}],
            }
            return
        name = sequence[i]
        yield {
            "type": "tool_call",
            "tool_call_id": f"tc-{i}",
            "name": name,
            "arguments": {},
        }
        yield {
            "type": "done",
            "stop_reason": "tool_use",
            "content": [
                {
                    "type": "toolCall",
                    "tool_call_id": f"tc-{i}",
                    "name": name,
                    "arguments": {},
                }
            ],
        }

    cfg = AgentLoopConfig(
        convert_to_llm=_identity_convert,
        safety=AgentSafetyConfig(
            max_iterations=10,
            max_wall_clock_seconds=None,
            max_consecutive_llm_errors=None,
            max_consecutive_tool_errors=2,
        ),
    )

    events = await _run([_user("go")], ctx, cfg, alternating)
    # Sequence is bad → ok (resets) → bad → done.  Counter never hits 2.
    terminated = [e for e in events if e["type"] == "agent_terminated"]
    assert terminated == []


@pytest.mark.anyio
async def test_llm_retry_recovers_from_transient_error():
    """First stream raises, second succeeds — loop should not terminate."""
    ctx = AgentContext(system_prompt="", messages=[], tools=[])
    cfg = AgentLoopConfig(
        convert_to_llm=_identity_convert,
        safety=AgentSafetyConfig(
            max_iterations=10,
            max_wall_clock_seconds=None,
            max_consecutive_llm_errors=3,
            max_consecutive_tool_errors=None,
            llm_retry_backoff_seconds=0,  # don't sleep in tests
        ),
    )

    events = await _run(
        [_user("go")],
        ctx,
        cfg,
        stream_raises_then(RuntimeError("transient"), "hello"),
    )
    terminated = [e for e in events if e["type"] == "agent_terminated"]
    assert terminated == []
    text_events = [e for e in events if e["type"] == "text_delta"]
    assert any(e["text"] == "hello" for e in text_events)


@pytest.mark.anyio
async def test_llm_retry_exhausted_terminates():
    """Persistent provider error eventually bails after the budget."""
    ctx = AgentContext(system_prompt="", messages=[], tools=[])
    cfg = AgentLoopConfig(
        convert_to_llm=_identity_convert,
        safety=AgentSafetyConfig(
            max_iterations=10,
            max_wall_clock_seconds=None,
            max_consecutive_llm_errors=2,
            max_consecutive_tool_errors=None,
            llm_retry_backoff_seconds=0,
        ),
    )

    events = await _run(
        [_user("go")],
        ctx,
        cfg,
        stream_raises(RuntimeError("upstream down")),
    )
    terminated = [e for e in events if e["type"] == "agent_terminated"]
    assert len(terminated) == 1
    assert terminated[0]["reason"] == "consecutive_llm_errors"
    assert terminated[0]["details"]["observed"] == 2
    assert "upstream down" in terminated[0]["details"]["last_error"]


@pytest.mark.anyio
async def test_safety_disabled_preserves_unbounded_behaviour():
    """``AgentSafetyConfig.disabled()`` should leave normal turns alone."""
    ctx = AgentContext(system_prompt="", messages=[], tools=[])
    cfg = AgentLoopConfig(
        convert_to_llm=_identity_convert,
        safety=AgentSafetyConfig.disabled(),
    )
    events = await _run([_user("hi")], ctx, cfg, stream_with_text("hello"))
    terminated = [e for e in events if e["type"] == "agent_terminated"]
    assert terminated == []
    assert any(e["type"] == "agent_end" for e in events)


@pytest.mark.anyio
async def test_default_safety_does_not_break_short_turns():
    """A normal one-turn chat completes cleanly with default safety."""
    ctx = AgentContext(system_prompt="", messages=[], tools=[])
    cfg = AgentLoopConfig(convert_to_llm=_identity_convert)  # default safety
    events = await _run([_user("hi")], ctx, cfg, stream_with_text("hi back"))
    terminated = [e for e in events if e["type"] == "agent_terminated"]
    assert terminated == []
    assert any(e["type"] == "agent_end" for e in events)
