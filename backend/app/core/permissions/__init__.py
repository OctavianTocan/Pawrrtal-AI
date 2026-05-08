"""Provider-agnostic tool permission system.

The chat surface exposes a small set of *permission modes* (the dropdown
in the composer toolbar).  Each mode declares which tool *categories* the
agent may call this turn — the model only sees tools it can actually use,
so it doesn't waste tokens trying to invoke a forbidden one.  A defensive
gate on the runtime path catches any case the filter missed.

Public surface (re-exported here for ergonomics):

  - :class:`PermissionMode` — the closed enum of modes.
  - :class:`ToolCategory`  — the categorisation each tool declares.
  - :func:`filter_tools_for_mode` — what the model is told it can use.
  - :func:`evaluate` — runtime gate; returns Allow / Deny.
  - :func:`system_prompt_addendum` — extra instruction text per mode.

The mode-to-category mapping lives in :mod:`.modes`; tools attach their
category by raising/setting :data:`AgentTool.category`.
"""

from __future__ import annotations

from .gate import PermissionDecision, evaluate
from .modes import (
    DEFAULT_PERMISSION_MODE,
    PermissionMode,
    ToolCategory,
    allowed_categories,
)
from .system_prompt import system_prompt_addendum
from .tools import filter_tools_for_mode

__all__ = [
    "DEFAULT_PERMISSION_MODE",
    "PermissionDecision",
    "PermissionMode",
    "ToolCategory",
    "allowed_categories",
    "evaluate",
    "filter_tools_for_mode",
    "system_prompt_addendum",
]
