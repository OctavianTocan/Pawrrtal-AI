"""
Pi-inspired provider-agnostic agent loop.

Architecture mirrors @mariozechner/pi-agent-core from pi-mono:
  https://github.com/badlogic/pi-mono/blob/main/packages/agent/src/agent-loop.ts

The loop owns:
  - Turn lifecycle (agent_start → turn_start → ... → turn_end → agent_end)
  - Tool call execution (sequential, with before/after hooks TBD)
  - Context transform before each LLM call
  - shouldStopAfterTurn early exit

Each provider supplies a StreamFn — the only provider-specific code.
The loop never imports any provider SDK directly.
"""

from __future__ import annotations

from collections.abc import AsyncIterator

from .types import (
    AgentContext,
    AgentEndEvent,
    AgentEvent,
    AgentLoopConfig,
    AgentMessage,
    AgentStartEvent,
    AgentTool,
    AssistantMessage,
    MessageEndEvent,
    MessageStartEvent,
    StreamFn,
    TextContent,
    TextDeltaEvent,
    ToolCallContent,
    ToolCallEndEvent,
    ToolCallStartEvent,
    ToolResultContent,
    ToolResultEvent,
    ToolResultMessage,
    TurnEndEvent,
    TurnStartEvent,
)


async def agent_loop(
    prompts: list[AgentMessage],
    context: AgentContext,
    config: AgentLoopConfig,
    stream_fn: StreamFn,
) -> AsyncIterator[AgentEvent]:
    """Run the agent loop and yield AgentEvents.

    Args:
        prompts: The new user message(s) for this turn.
        context: Shared context — system prompt, prior messages, tools.
                 Mutated in place as the loop accumulates messages.
        config: Loop configuration — convert_to_llm, transform_context,
                should_stop_after_turn.
        stream_fn: Provider-specific streaming function.  Accepts the
                   current message list (after transform + convert) and
                   tool list; yields LLMEvents.

    Yields:
        AgentEvents in the sequence:
          agent_start
            turn_start
              message_start / message_end  (for each prompt)
              text_delta*                  (streamed text)
              tool_call_start / tool_call_end / tool_result  (when tools used)
            turn_end
          [more turns if tool calls triggered a loop-back]
          agent_end
    """
    # Build up the list of all new messages produced in this invocation.
    new_messages: list[AgentMessage] = list(prompts)

    # Add prompts to context so the LLM sees them in the first call.
    current_messages = list(context.messages) + list(prompts)

    yield AgentStartEvent(type="agent_start")
    yield TurnStartEvent(type="turn_start")

    # Emit start/end events for the incoming prompt(s).
    for prompt in prompts:
        yield MessageStartEvent(type="message_start", message=prompt)
        yield MessageEndEvent(type="message_end", message=prompt)

    async for event in _run_loop(
        current_messages, context.tools, new_messages, config, stream_fn
    ):
        yield event


async def _run_loop(
    messages: list[AgentMessage],
    tools: list[AgentTool],
    new_messages: list[AgentMessage],
    config: AgentLoopConfig,
    stream_fn: StreamFn,
) -> AsyncIterator[AgentEvent]:
    """Inner loop — handles multiple turns when tool calls require looping back."""
    first_turn = True

    while True:
        if not first_turn:
            yield TurnStartEvent(type="turn_start")
        first_turn = False

        # ── Context transform (e.g. sliding window, compaction) ──────────
        transformed = messages
        if config.transform_context is not None:
            transformed = await config.transform_context(list(messages))

        # ── Convert to LLM-compatible format ─────────────────────────────
        llm_messages = config.convert_to_llm(transformed)

        # ── Stream the assistant response ─────────────────────────────────
        assistant_content: list[TextContent | ToolCallContent] = []
        stop_reason = "stop"

        async for llm_event in stream_fn(llm_messages, tools):
            # Narrow the LLMEvent union by its ``type`` discriminant so
            # field access types correctly without an ``assert isinstance``
            # + ``# type: ignore`` dance (and so bandit B101 stays clean).
            if llm_event["type"] == "text_delta":
                yield TextDeltaEvent(type="text_delta", text=llm_event["text"])

            elif llm_event["type"] == "tool_call":
                yield ToolCallStartEvent(
                    type="tool_call_start",
                    tool_call_id=llm_event["tool_call_id"],
                    name=llm_event["name"],
                )
                yield ToolCallEndEvent(
                    type="tool_call_end",
                    tool_call_id=llm_event["tool_call_id"],
                    name=llm_event["name"],
                    arguments=llm_event["arguments"],
                )

            elif llm_event["type"] == "done":
                assistant_content = llm_event["content"]
                stop_reason = llm_event["stop_reason"]

        # Build the AssistantMessage for this turn.
        assistant_msg = AssistantMessage(
            role="assistant",
            content=assistant_content,
            stop_reason=stop_reason,
        )
        messages.append(assistant_msg)
        new_messages.append(assistant_msg)

        # ── Execute tool calls if any ─────────────────────────────────────
        tool_calls = [b for b in assistant_content if b["type"] == "toolCall"]
        tool_results: list[ToolResultMessage] = []

        if tool_calls:
            tool_map = {t.name: t for t in tools}

            for tc in tool_calls:
                # Already filtered by ``b["type"] == "toolCall"`` above,
                # but mypy doesn't carry that narrowing through the list
                # comp — this if-branch tells the checker explicitly.
                if tc["type"] != "toolCall":
                    continue
                tool = tool_map.get(tc["name"])
                is_error = False
                result_text: str

                if tool is None:
                    result_text = f"Tool '{tc['name']}' not found."
                    is_error = True
                else:
                    try:
                        result_text = await tool.execute(
                            tc["tool_call_id"], **tc["arguments"]
                        )
                    except Exception as exc:
                        result_text = f"Tool error: {exc}"
                        is_error = True

                yield ToolResultEvent(
                    type="tool_result",
                    tool_call_id=tc["tool_call_id"],
                    content=result_text,
                    is_error=is_error,
                )

                tool_result_msg = ToolResultMessage(
                    role="toolResult",
                    tool_call_id=tc["tool_call_id"],
                    content=[ToolResultContent(type="text", text=result_text)],
                    is_error=is_error,
                )
                tool_results.append(tool_result_msg)
                messages.append(tool_result_msg)
                new_messages.append(tool_result_msg)

        yield TurnEndEvent(
            type="turn_end",
            message=assistant_msg,
            tool_results=tool_results,
        )

        # ── Check stop conditions ─────────────────────────────────────────
        if stop_reason in {"error", "aborted"}:
            break

        if config.should_stop_after_turn is not None:
            fake_ctx = _make_context_snapshot(messages, tools)
            if config.should_stop_after_turn(fake_ctx):
                break

        # Loop back only if there were tool calls (and no stop triggered).
        if not tool_calls:
            break

    yield AgentEndEvent(type="agent_end", messages=new_messages)


def _make_context_snapshot(
    messages: list[AgentMessage],
    tools: list[AgentTool],
) -> AgentContext:
    """Build an AgentContext snapshot for the shouldStopAfterTurn callback.

    ``system_prompt`` isn't surfaced to stop predicates today (callers
    inspect ``messages``/``tools``), so we pass an empty string rather
    than threading it through an extra parameter.
    """
    return AgentContext(system_prompt="", messages=messages, tools=tools)
