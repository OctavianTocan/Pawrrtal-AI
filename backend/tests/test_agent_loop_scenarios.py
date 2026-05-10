"""Scripted-trajectory scenario tests for the agent loop.

These tests author deterministic LLM decision sequences (tool calls, text
replies, provider errors) and run them through the *real* agent_loop,
safety layer, and tool-execution code.  Only the LLM is replaced — every
other component executes as it would in production.

This "reverse eval" approach gives high confidence that the harness handles
realistic multi-step flows correctly, without needing a live API key or
mocking dozens of internal collaborators.

See ``tests/agent_harness.py`` for the shared primitives and the full
rationale for the pattern.
"""

from __future__ import annotations

import pytest

from app.core.agent_loop import AgentSafetyConfig

from tests.agent_harness import (
    ScriptedStreamFn,
    echo_tool,
    error_turn,
    failing_tool,
    run_scenario,
    text_turn,
    tool_call_turn,
)


# Convenience aliases so individual tests don't repeat the import path.
_text = text_turn
_tool = tool_call_turn
_err = error_turn


# ---------------------------------------------------------------------------
# Scenario 1 — clean single-turn text reply
# ---------------------------------------------------------------------------


@pytest.mark.anyio
async def test_clean_text_reply_emits_delta_and_end() -> None:
    """A plain text response produces text_delta events and agent_end."""
    events = await run_scenario([_text("Hello, world!")])

    types = [e["type"] for e in events]
    assert "text_delta" in types
    assert "agent_end" in types
    assert "agent_terminated" not in types

    text_events = [e for e in events if e["type"] == "text_delta"]
    assert any("Hello, world!" in e.get("text", "") for e in text_events)


# ---------------------------------------------------------------------------
# Scenario 2 — realistic multi-turn: tool call then text reply
# ---------------------------------------------------------------------------


@pytest.mark.anyio
async def test_tool_call_then_text_reply_full_lifecycle() -> None:
    """Agent calls a tool, gets the result, then replies with text.

    This is the most common real-world flow:
    turn 1: LLM decides to call echo("hi") → tool executes → result in context
    turn 2: LLM sees the result and replies with text → loop ends
    """
    script = ScriptedStreamFn([
        _tool("echo", {"value": "hi"}, turn_id="tc-1"),
        _text("I echoed hi for you."),
    ])

    events = await run_scenario(
        script,          # pass ScriptedStreamFn directly to track call_count
        tools=[echo_tool()],
    )

    # Both LLM turns were invoked.
    assert script.call_count == 2

    # The tool was called and produced a result.
    tool_start = [e for e in events if e["type"] == "tool_call_start"]
    tool_result = [e for e in events if e["type"] == "tool_result"]
    assert len(tool_start) == 1
    assert tool_start[0]["name"] == "echo"
    assert len(tool_result) == 1
    assert "echoed" in tool_result[0]["content"]

    # Final text reply arrived.
    text_events = [e for e in events if e["type"] == "text_delta"]
    assert any("I echoed" in e.get("text", "") for e in text_events)

    # Loop finished cleanly.
    assert any(e["type"] == "agent_end" for e in events)
    assert not any(e["type"] == "agent_terminated" for e in events)


# ---------------------------------------------------------------------------
# Scenario 3 — chained tool calls before final answer
# ---------------------------------------------------------------------------


@pytest.mark.anyio
async def test_chained_tool_calls_before_text_reply() -> None:
    """Agent calls a tool twice then replies; both results flow into context."""
    search = echo_tool("search")
    summarize = echo_tool("summarize")

    script = ScriptedStreamFn([
        _tool("search", {"value": "python async"}, turn_id="tc-1"),
        _tool("summarize", {"value": "results"}, turn_id="tc-2"),
        _text("Here is the summary."),
    ])

    events = await run_scenario(
        script,
        tools=[search, summarize],
    )

    assert script.call_count == 3

    # Two distinct tool calls were dispatched and both returned results.
    tool_starts = [e for e in events if e["type"] == "tool_call_start"]
    tool_results = [e for e in events if e["type"] == "tool_result"]
    assert len(tool_starts) == 2
    assert {e["name"] for e in tool_starts} == {"search", "summarize"}
    assert len(tool_results) == 2

    # Final text reply arrived after both tool rounds.
    assert any(
        "summary" in e.get("text", "")
        for e in events if e["type"] == "text_delta"
    )
    assert any(e["type"] == "agent_end" for e in events)


# ---------------------------------------------------------------------------
# Scenario 4 — transient LLM error, then recovery
# ---------------------------------------------------------------------------


@pytest.mark.anyio
async def test_transient_llm_error_recovers_to_text_reply() -> None:
    """A single provider failure should not terminate the agent.

    The safety layer retries, and the next turn (text) succeeds.
    """
    events = await run_scenario(
        turns=[_err(), _text("Recovered successfully.")],
        safety=AgentSafetyConfig(
            max_iterations=10,
            max_wall_clock_seconds=None,
            max_consecutive_llm_errors=3,
            max_consecutive_tool_errors=None,
            llm_retry_backoff_seconds=0,
        ),
    )

    assert not any(e["type"] == "agent_terminated" for e in events)
    assert any(
        "Recovered" in e.get("text", "")
        for e in events if e["type"] == "text_delta"
    )
    assert any(e["type"] == "agent_end" for e in events)


# ---------------------------------------------------------------------------
# Scenario 5 — tool failure; LLM sees error in context and adapts
# ---------------------------------------------------------------------------


@pytest.mark.anyio
async def test_tool_failure_result_surfaces_in_context() -> None:
    """When a tool raises, the error text becomes a tool_result the LLM can see.

    The loop should NOT terminate — the LLM receives the failure as context
    and is free to try another approach or reply with an apology.
    """
    script = ScriptedStreamFn([
        _tool("fail", {}, turn_id="tc-1"),
        _text("I'm sorry, the operation failed."),
    ])

    events = await run_scenario(
        script,
        tools=[failing_tool("fail")],
        safety=AgentSafetyConfig(
            max_iterations=10,
            max_wall_clock_seconds=None,
            max_consecutive_llm_errors=None,
            max_consecutive_tool_errors=5,  # generous — only 1 failure here
        ),
    )

    assert script.call_count == 2

    # The tool error surfaces as a tool_result event (not an exception to caller).
    tool_results = [e for e in events if e["type"] == "tool_result"]
    assert len(tool_results) == 1
    assert "fail" in tool_results[0]["content"].lower()

    # The LLM's apology text arrives after seeing the error.
    assert any(
        "sorry" in e.get("text", "").lower()
        for e in events if e["type"] == "text_delta"
    )
    assert any(e["type"] == "agent_end" for e in events)


# ---------------------------------------------------------------------------
# Scenario 6 — runaway tool loop hits max_iterations
# ---------------------------------------------------------------------------


@pytest.mark.anyio
async def test_runaway_tool_loop_terminated_by_max_iterations() -> None:
    """A model stuck calling the same tool indefinitely is stopped by the cap.

    Uses a realistic limit of 5 — the safety layer must terminate before
    the 6th iteration even though the script extends further.
    """
    # 10 tool call turns — far more than the safety cap.
    turns = [_tool("ping", {}, turn_id=f"tc-{i}") for i in range(10)]

    script = ScriptedStreamFn(turns)
    events = await run_scenario(
        script,
        tools=[echo_tool("ping")],
        safety=AgentSafetyConfig(
            max_iterations=5,
            max_wall_clock_seconds=None,
            max_consecutive_llm_errors=None,
            max_consecutive_tool_errors=None,
        ),
    )

    terminated = [e for e in events if e["type"] == "agent_terminated"]
    assert len(terminated) == 1
    assert terminated[0]["reason"] == "max_iterations"
    assert terminated[0]["details"]["limit"] == 5
    # The script was cut short at the limit.
    assert script.call_count == 5


# ---------------------------------------------------------------------------
# Scenario 7 — persistent LLM errors exhaust the retry budget
# ---------------------------------------------------------------------------


@pytest.mark.anyio
async def test_persistent_llm_errors_terminate_loop() -> None:
    """Back-to-back LLM failures exhaust the consecutive-error budget."""
    events = await run_scenario(
        turns=[_err(), _err(), _err(), _err()],
        safety=AgentSafetyConfig(
            max_iterations=20,
            max_wall_clock_seconds=None,
            max_consecutive_llm_errors=3,
            max_consecutive_tool_errors=None,
            llm_retry_backoff_seconds=0,
        ),
    )

    terminated = [e for e in events if e["type"] == "agent_terminated"]
    assert len(terminated) == 1
    assert terminated[0]["reason"] == "consecutive_llm_errors"
    assert terminated[0]["details"]["observed"] == 3
    assert "provider unavailable" in terminated[0]["details"]["last_error"]


# ---------------------------------------------------------------------------
# Scenario 8 — consecutive tool failures exhaust the error budget
# ---------------------------------------------------------------------------


@pytest.mark.anyio
async def test_consecutive_tool_failures_terminate_loop() -> None:
    """Repeated tool failures trip the tool-error guard.

    The LLM keeps requesting the broken tool each turn; after N failures
    in a row the safety layer bails.
    """
    events = await run_scenario(
        turns=[_tool("bad", {}) for _ in range(6)],
        tools=[failing_tool("bad")],
        safety=AgentSafetyConfig(
            max_iterations=20,
            max_wall_clock_seconds=None,
            max_consecutive_llm_errors=None,
            max_consecutive_tool_errors=4,
        ),
    )

    terminated = [e for e in events if e["type"] == "agent_terminated"]
    assert len(terminated) == 1
    assert terminated[0]["reason"] == "consecutive_tool_errors"
    assert terminated[0]["details"]["observed"] == 4


# ---------------------------------------------------------------------------
# Scenario 9 — context grows with each turn (history accumulation)
# ---------------------------------------------------------------------------


@pytest.mark.anyio
async def test_message_context_grows_across_turns() -> None:
    """Each LLM turn sees more messages than the previous one.

    After a tool call, the LLM's next invocation must include the
    tool result in the messages list, proving history accumulation works.
    """
    from app.core.agent_loop import (
        AgentContext,
        AgentLoopConfig,
        AgentSafetyConfig,
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
    from tests.agent_harness import identity_convert

    seen_messages: list[list] = []
    turn_counter: list[int] = [0]

    async def recording_fn(messages, tools):
        idx = turn_counter[0]
        turn_counter[0] += 1
        seen_messages.append(list(messages))

        if idx == 0:
            yield LLMToolCallEvent(
                type="tool_call",
                tool_call_id="tc-0",
                name="echo",
                arguments={"value": "ctx-test"},
            )
            yield LLMDoneEvent(
                type="done",
                stop_reason="tool_use",
                content=[
                    ToolCallContent(
                        type="toolCall",
                        tool_call_id="tc-0",
                        name="echo",
                        arguments={"value": "ctx-test"},
                    )
                ],
            )
        else:
            yield LLMTextDeltaEvent(type="text_delta", text="done")
            yield LLMDoneEvent(
                type="done",
                stop_reason="stop",
                content=[TextContent(type="text", text="done")],
            )

    ctx = AgentContext(system_prompt="", messages=[], tools=[echo_tool()])
    cfg = AgentLoopConfig(
        convert_to_llm=identity_convert,
        safety=AgentSafetyConfig.disabled(),
    )
    events = [
        ev
        async for ev in agent_loop(
            [UserMessage(role="user", content="go")], ctx, cfg, recording_fn
        )
    ]

    # Two LLM calls happened.
    assert len(seen_messages) == 2

    # The second call saw more messages than the first.
    assert len(seen_messages[1]) > len(seen_messages[0])

    # The second call's messages include a tool result.
    roles = [m["role"] for m in seen_messages[1]]
    assert "toolResult" in roles

    # Loop completed without safety termination.
    assert not any(e["type"] == "agent_terminated" for e in events)


# ---------------------------------------------------------------------------
# Scenario: generate_image tool call flows through the harness
# ---------------------------------------------------------------------------


@pytest.mark.anyio
async def test_generate_image_tool_result_flows_to_llm_context(
    tmp_path: Path,
) -> None:
    """Agent calls generate_image, tool executes, result appears in next LLM turn.

    The harness test verifies that:
    1. The tool_call_start event carries the correct tool name.
    2. The tool result JSON is well-formed and contains the saved path.
    3. The PNG file was actually written to the workspace.
    4. The second LLM turn receives the tool result in its message context.
    """
    import json as _json
    from pathlib import Path as _Path

    from app.core.agent_loop.types import AgentTool as _AgentTool

    fake_png = b"\x89PNG\r\n\x1a\n" + b"\x00" * 64

    async def _execute(tool_call_id: str, **kwargs: object) -> str:
        out_dir = tmp_path / "generated_images"
        out_dir.mkdir(exist_ok=True)
        fname = "20260510T000000_test_cat.png"
        (out_dir / fname).write_bytes(fake_png)
        return _json.dumps(
            {
                "status": "success",
                "path": f"generated_images/{fname}",
                "size_bytes": len(fake_png),
                "dimensions": "1024x1024",
                "quality": "medium",
                "message": f"Image saved to generated_images/{fname}",
            }
        )

    image_tool = _AgentTool(
        name="generate_image",
        description="Generate an image from a prompt.",
        parameters={
            "type": "object",
            "properties": {"prompt": {"type": "string"}},
            "required": ["prompt"],
        },
        execute=_execute,
    )

    script = ScriptedStreamFn(
        [
            _tool("generate_image", {"prompt": "a cat on a hill"}, turn_id="tc-img"),
            _text("Here is your image of a cat on a hill."),
        ]
    )

    events = await run_scenario(script, tools=[image_tool])

    # Both LLM turns were invoked.
    assert script.call_count == 2

    # Tool call was started with the right name.
    starts = [e for e in events if e["type"] == "tool_call_start"]
    assert len(starts) == 1
    assert starts[0]["name"] == "generate_image"

    # Tool result arrived and is valid JSON.
    results = [e for e in events if e["type"] == "tool_result"]
    assert len(results) == 1
    data = _json.loads(results[0]["content"])
    assert data["status"] == "success"
    assert data["path"].startswith("generated_images/")

    # PNG was actually written to disk.
    saved = tmp_path / data["path"]
    assert saved.exists()
    assert saved.read_bytes() == fake_png

    # Second LLM turn received the tool result as context.
    turn2_messages = script.messages_seen[1]
    assert any(m["role"] == "toolResult" for m in turn2_messages)

    # Loop ended cleanly.
    assert any(e["type"] == "agent_end" for e in events)
    assert not any(e["type"] == "agent_terminated" for e in events)
