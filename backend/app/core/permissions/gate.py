"""Runtime permission gate.

Defensive layer that runs immediately before a tool executes.  The
primary mechanism for keeping forbidden tools out of the agent's hands
is :func:`tools.filter_tools_for_mode` — this gate is the seatbelt that
catches any case where the filter was bypassed (a hand-crafted tool call
in tests, a misconfigured caller, a tool added at runtime, etc.).

Returning ``Allow`` / ``Deny`` mirrors the Claude Agent SDK's
``PermissionResult`` shape so we can adapt this gate into a
``can_use_tool`` callback for the Claude provider with minimal glue.
"""

from __future__ import annotations

from dataclasses import dataclass

from .modes import PermissionMode, ToolCategory, allowed_categories


@dataclass(frozen=True)
class PermissionDecision:
    """Outcome of a permission evaluation.

    Attributes:
        allow: ``True`` when the tool may execute, ``False`` otherwise.
        reason: Human-readable explanation included in the tool result
            string when ``allow`` is ``False``.  The model reads this
            verbatim, so the wording should suggest a recovery (\"switch
            to Full Access in the model selector\") rather than just
            describe the failure.
    """

    allow: bool
    reason: str = ""


_ALLOWED = PermissionDecision(allow=True)


def evaluate(category: ToolCategory, mode: PermissionMode) -> PermissionDecision:
    """Decide whether a tool of *category* may run under *mode*.

    Args:
        category: The :class:`ToolCategory` declared by the tool.
        mode: The active :class:`PermissionMode` for this turn.

    Returns:
        :class:`PermissionDecision` with ``allow`` set and, on denial, a
        ``reason`` string the agent will surface to the user.
    """
    if category in allowed_categories(mode):
        return _ALLOWED

    # Denials surface a recovery hint rather than a bare \"forbidden\".
    # The agent quotes this back to the user, so phrasing matters.
    if mode == PermissionMode.PLAN:
        reason = (
            f"This is a {category.value} tool, blocked under Plan mode. "
            "Plan mode is read-only by design — switch to Full Access "
            "in the model selector when you're ready to execute the plan."
        )
    elif mode == PermissionMode.ASK_TO_EDIT:
        reason = (
            f"This is a {category.value} tool, blocked under "
            "Ask-to-Edit. Switch to Full Access in the model selector "
            "to allow the change."
        )
    else:
        reason = (
            f"Tool category '{category.value}' is not permitted under "
            f"the active permission mode '{mode.value}'."
        )
    return PermissionDecision(allow=False, reason=reason)
