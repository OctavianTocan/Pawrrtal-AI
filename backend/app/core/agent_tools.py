"""Compose the per-turn tool list the agent has access to.

This module is the **single source of truth** for which tools the
agent is exposed to.  Adding a new tool means appending to
``build_agent_tools`` here — never reaching into a provider, and
never scattering tool selection across handlers.

Why a dedicated module instead of inlining in ``app.api.chat``:

  * The chat router's job is HTTP plumbing (auth, request body,
    streaming), not deciding which capabilities the agent has.
  * Future per-agent / per-user / per-conversation permission gating
    must live above the providers (see
    ``.claude/rules/architecture/no-tools-in-providers.md``).  Putting
    that logic in the chat handler would tangle it with the streaming
    code; putting it here keeps the gate testable in isolation.
  * It gives the test suite a single function to drive when verifying
    \"does the agent see Exa when EXA_API_KEY is configured?\"
    end-to-end — no mocking the FastAPI request cycle.

The function is sync on purpose: every tool factory it calls is sync,
and the composition itself does no I/O.  Async-ifying the signature
would force callers (the chat router today, anything else tomorrow)
to ``await`` for no benefit.
"""

from __future__ import annotations

from pathlib import Path

from app.core.agent_loop.types import AgentTool
from app.core.config import settings
from app.core.tools.exa_search_agent import make_exa_search_tool
from app.core.tools.workspace_files import make_workspace_tools


def build_agent_tools(*, workspace_root: Path) -> list[AgentTool]:
    """Return the full ``AgentTool`` list for one chat turn.

    Args:
        workspace_root: The user's default workspace directory.  Passed
            to :func:`make_workspace_tools` so the resulting tools are
            scoped to that directory — the agent cannot escape it.

    Returns:
        A fresh list of :class:`AgentTool` ready to hand to a provider.
        Order is **stable**: workspace tools first (the agent's default
        operating surface), then capability-gated tools (web search,
        future capabilities).  Stable order matters for the Claude
        bridge's ``allowed_tools`` whitelist construction and for
        snapshot-style tests.
    """
    tools: list[AgentTool] = []

    # Filesystem access scoped to the workspace.  Always present —
    # the agent is fundamentally a notebook editor, and these are the
    # primitives it edits with.
    tools.extend(make_workspace_tools(workspace_root))

    # Web search via Exa.  Capability-gated on the API key being
    # configured — if the operator hasn't set ``EXA_API_KEY``, web
    # search is silently absent rather than the agent calling a tool
    # that errors at runtime with \"missing key\".
    if settings.exa_api_key:
        tools.append(make_exa_search_tool())

    return tools
