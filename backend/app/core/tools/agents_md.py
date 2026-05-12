"""Utility to load a workspace's identity files as a system-prompt string.

The agent's system prompt is built by concatenating, in order:

  1. ``SOUL.md`` — who the agent is.  Per the workspace convention this
     file is editable by the agent itself, so the system prompt always
     reflects the agent's current self-description.
  2. ``AGENTS.md`` — operating rules + workspace-specific guidance.

Both files live at the workspace root.  Each load returns ``None`` on
failure so the caller can fall back to a hard-coded default per file.

This is intentionally a thin I/O helper — all prompt-assembly decisions
(fallback text, prefix/suffix injection, separators) live in the chat
endpoint.
"""

from __future__ import annotations

import logging
from pathlib import Path

from app.core.fs import read_capped_utf8
from app.core.preferences import preferences_to_prompt_section, read_preferences

log = logging.getLogger(__name__)

_AGENTS_MD = "AGENTS.md"
_SOUL_MD = "SOUL.md"
_MAX_BYTES = 64_000  # 64 KB — generous but keeps the context window sane

# Files at the workspace root that the agent must NEVER be able to
# delete or rename.  Used by the workspace_files write tool — see
# `app/core/tools/workspace_files.py::is_protected_path`.
PROTECTED_FILENAMES: frozenset[str] = frozenset(
    {
        _AGENTS_MD,
        _SOUL_MD,
        "USER.md",
        "IDENTITY.md",
    }
)


def read_agents_md(workspace_root: Path) -> str | None:
    """Return the text of *workspace_root*/AGENTS.md, or ``None`` on failure."""
    return read_capped_utf8(workspace_root / _AGENTS_MD, max_bytes=_MAX_BYTES)


def read_soul_md(workspace_root: Path) -> str | None:
    """Return the text of *workspace_root*/SOUL.md, or ``None`` on failure.

    SOUL.md is the agent's self-description and is intentionally
    editable by the agent itself — when the agent rewrites it, the next
    turn's system prompt reflects the new identity.
    """
    return read_capped_utf8(workspace_root / _SOUL_MD, max_bytes=_MAX_BYTES)


def assemble_workspace_prompt(workspace_root: Path) -> str | None:
    """Return SOUL.md + AGENTS.md + preferences.toml as a single system prompt.

    Order (each section is optional):
      1. ``SOUL.md`` — who you are
      2. ``AGENTS.md`` — how to operate here
      3. Rendered ``preferences.toml`` — what the user wants right now

    Each section is separated by a horizontal-rule line.  Returns ``None``
    only when every section is empty/missing, so the provider falls back
    to its built-in default.  A missing section is omitted with no trace
    (no "(file missing)" placeholder text reaches the agent).
    """
    soul = read_soul_md(workspace_root)
    agents = read_agents_md(workspace_root)
    preferences = preferences_to_prompt_section(read_preferences(workspace_root))

    parts: list[str] = []
    if soul is not None:
        parts.append(soul)
    if agents is not None:
        parts.append(agents)
    if preferences is not None:
        parts.append(preferences)

    if not parts:
        return None
    return "\n\n---\n\n".join(parts)
