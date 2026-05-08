"""Per-mode system-prompt addenda.

Plan mode in particular changes the agent's behaviour beyond just
restricting tools — it tells the model to *survey, then plan, then
stop*.  That instruction has to land in the system prompt, not just in
the tool surface.

This module returns a string per mode that the chat router appends to
the assembled system prompt (workspace AGENTS.md, etc.).
"""

from __future__ import annotations

from .modes import PermissionMode

_PLAN_ADDENDUM = """\
You are operating in PLAN mode.

In Plan mode you are a thoughtful surveyor, not an executor.  Your job:

  1. Use the read-only tools (read_file, list_dir, search) to understand
     the workspace and the user's request.
  2. Draft a concrete, step-by-step plan describing the changes you
     would make if asked to execute it.
  3. Stop.  Do not call any write or exec tools — they're blocked in
     this mode anyway, but the user expects a finished plan, not a
     half-executed change.

Format the final plan as a numbered list of small, verifiable steps.
Each step should name the file(s) it touches and what changes are made.
The user will review the plan and switch to Full Access mode to run it.
"""

_DEFAULT_ADDENDUM = """\
You are operating in ASK-TO-EDIT mode.

Read-only tools auto-approve; write or exec tools are blocked.  If a
change requires writing to the workspace, describe what you would do
and ask the user to switch to Full Access — do not attempt to call a
write tool.  The model selector in the chat composer is where they
toggle modes.
"""


def system_prompt_addendum(mode: PermissionMode) -> str:
    """Return extra system-prompt text for *mode*, or empty string.

    The chat router appends this to the assembled system prompt
    (workspace AGENTS.md + provider defaults).  Empty string for modes
    that need no behavioural change beyond tool filtering.
    """
    if mode == PermissionMode.PLAN:
        return _PLAN_ADDENDUM
    if mode == PermissionMode.DEFAULT_PERMISSIONS:
        return _DEFAULT_ADDENDUM
    # FULL_ACCESS, AUTO_REVIEW (treated as full for now), CUSTOM all
    # need no extra system-prompt instruction.
    return ""
