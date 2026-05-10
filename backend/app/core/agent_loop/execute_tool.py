"""Tool dispatch for :func:`app.core.agent_loop.loop.agent_loop` (with optional Sigil)."""

from __future__ import annotations

import logging
from typing import Any

from sigil_sdk import ToolExecutionStart

from app.core.agent_loop.types import AgentTool
from app.core.telemetry.sigil_runtime import get_sigil_client

_log = logging.getLogger(__name__)


async def run_agent_tool(
    tool: AgentTool | None,
    name: str,
    tool_call_id: str,
    arguments: dict[str, Any],
) -> tuple[str, bool]:
    """Execute a tool; record a Sigil tool span when a client is configured."""
    client = get_sigil_client()
    if client is None:
        return await _execute_raw(tool, name, tool_call_id, arguments)

    with client.start_tool_execution(
        ToolExecutionStart(
            tool_name=name,
            tool_call_id=tool_call_id,
            tool_type="function",
            include_content=False,
            tags={"pipeline": "agent-loop"},
        ),
    ) as rec:
        result_text, is_error = await _execute_raw(tool, name, tool_call_id, arguments)
        rec.set_result(arguments=arguments, result=result_text)
        err = rec.err()
        if err is not None:
            _log.warning("Sigil tool recorder error (%s): %s", name, err)
        return result_text, is_error


async def _execute_raw(
    tool: AgentTool | None,
    name: str,
    tool_call_id: str,
    arguments: dict[str, Any],
) -> tuple[str, bool]:
    if tool is None:
        return f"Tool '{name}' not found.", True
    try:
        text = await tool.execute(tool_call_id, **arguments)
        return text, False
    except Exception as exc:
        return f"Tool error: {exc}", True
