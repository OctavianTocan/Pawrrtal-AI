"""Filter the AgentTool list shown to the model based on permission mode.

This is the *primary* mechanism for permission enforcement: the model
never sees a tool it isn't allowed to call, so it doesn't waste tokens
trying.  The runtime gate in :mod:`.gate` is a defensive backstop.
"""

from __future__ import annotations

from app.core.agent_loop.types import AgentTool

from .modes import PermissionMode, ToolCategory, allowed_categories


def _category_of(tool: AgentTool) -> ToolCategory:
    """Resolve a tool's category, defaulting to the safest class.

    Tools declare their category by setting an attribute on the
    :class:`AgentTool` instance (see :func:`workspace_files.make_workspace_tools`
    and friends).  Untagged tools default to ``WRITE`` — fail closed:
    if you forgot to categorise a tool, the most restrictive modes
    will hide it instead of accidentally exposing it.
    """
    return getattr(tool, "category", ToolCategory.WRITE)


def filter_tools_for_mode(
    tools: list[AgentTool], mode: PermissionMode
) -> list[AgentTool]:
    """Return only the tools whose category is allowed under *mode*.

    Args:
        tools: All tools that *could* be made available this turn.
        mode: The active permission mode.

    Returns:
        A new list containing the subset of ``tools`` allowed under
        ``mode``.  Order is preserved.
    """
    permitted = allowed_categories(mode)
    return [tool for tool in tools if _category_of(tool) in permitted]
