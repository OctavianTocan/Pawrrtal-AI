"""Permission mode enum and per-mode tool-category whitelists.

A *permission mode* is the user-facing safety knob in the chat composer.
A *tool category* is a coarse risk class each :class:`AgentTool` declares
(``READ``, ``WRITE``, ``EXEC``).  This module is the single source of
truth for which categories each mode allows.

The wiring across the codebase:

  - The frontend sends ``permission_mode`` in the chat request body.
  - The chat router calls :func:`filter_tools_for_mode` to drop any tool
    whose category isn't allowed *before* showing the toolset to the
    model — this is the primary mechanism, so the model doesn't even
    know forbidden tools exist.
  - The agent loop also calls :func:`evaluate` defensively before
    executing a tool, so a misconfigured filter or a hand-crafted tool
    call can't bypass the gate.
"""

from __future__ import annotations

from enum import StrEnum


class PermissionMode(StrEnum):
    """User-facing permission modes.

    Codes are stable strings.  The frontend sends one of these in every
    chat request body.  Renaming a member is a breaking change.
    """

    PLAN = "plan"
    """Read-only + a planning system-prompt addendum.  The agent
    surveys the workspace, drafts a plan, and stops short of any change.
    Same tool surface as ``ASK_TO_EDIT`` plus a planning prompt.
    """

    ASK_TO_EDIT = "ask-to-edit"
    """Default for new users.  Read-only tools auto-allow; write/exec
    tools are blocked with a hint that asks the user to switch modes.

    The long-term intent is an interactive approval round-trip — the
    agent attempts a write, the UI surfaces an inline approval card,
    the user clicks Approve or Deny, and the agent loop resumes.  That
    streaming/suspend-resume protocol is non-trivial and tracked in
    `.beans/ai-nexus-perm--ask-to-edit-interactive-approval-round-trip.md`.

    Until the round-trip ships, this mode is functionally deny-write so
    we never silently mutate a user's workspace.
    """

    AUTO_REVIEW = "auto-review"
    """Reserved for the auto-review feature (a second LLM judges each
    tool call's safety before approving).  Not implemented yet — the
    UI element is rendered with a "not implemented" hint and treats
    selection as full access for now.  Tracked in beans.
    """

    FULL_ACCESS = "full-access"
    """Bypass.  Every tool call is allowed.  Use only for trusted
    automation."""

    CUSTOM = "custom"
    """Reserved for a future ``permissions.json``-driven mode \xe0 la Craft
    Agents.  Disabled in the UI for now — selection falls back to
    ``ASK_TO_EDIT`` semantics."""


# Default mode for users who haven't expressed a preference yet.  Matches
# the frontend's localStorage default; centralising it here lets the
# backend reject missing values explicitly without guessing.
DEFAULT_PERMISSION_MODE: PermissionMode = PermissionMode.ASK_TO_EDIT


class ToolCategory(StrEnum):
    """Coarse risk classification each tool declares.

    Kept small on purpose: every additional category is one more thing
    each tool author has to think about, and the UX maps cleanly onto
    three levels (look / change / execute).  A tool that doesn't fit
    here probably wants its own gate, not a new category.
    """

    READ = "read"
    """Pure observation — read a file, list a directory, search the web.
    No side effects on the workspace, the host, or external systems."""

    WRITE = "write"
    """Mutates the workspace — write a file, delete a file, modify
    project state.  Reversible with the workspace's history but may
    surprise the user if invoked unexpectedly."""

    EXEC = "exec"
    """Executes code, shell commands, or external API mutations.  May
    have side effects beyond the workspace and is the highest-risk
    class.  Reserved for future tools (we don't ship a ``run_bash`` yet)."""


# ---------------------------------------------------------------------------
# Mode → category whitelist
# ---------------------------------------------------------------------------

# Frozensets, not lists, so the table is hashable and accidental
# mutation is impossible.  Re-ordering or adding a category here is the
# only way to change what a mode permits — keep the mapping small and
# auditable.
_MODE_ALLOWS: dict[PermissionMode, frozenset[ToolCategory]] = {
    PermissionMode.PLAN: frozenset({ToolCategory.READ}),
    PermissionMode.ASK_TO_EDIT: frozenset({ToolCategory.READ}),
    PermissionMode.AUTO_REVIEW: frozenset(
        {ToolCategory.READ, ToolCategory.WRITE, ToolCategory.EXEC}
    ),
    PermissionMode.FULL_ACCESS: frozenset(
        {ToolCategory.READ, ToolCategory.WRITE, ToolCategory.EXEC}
    ),
    PermissionMode.CUSTOM: frozenset({ToolCategory.READ}),
}


def allowed_categories(mode: PermissionMode) -> frozenset[ToolCategory]:
    """Return the set of tool categories ``mode`` permits.

    Missing modes fall back to the safest set (``READ`` only) rather
    than allowing everything — fail closed on lookup failure.
    """
    return _MODE_ALLOWS.get(mode, frozenset({ToolCategory.READ}))
