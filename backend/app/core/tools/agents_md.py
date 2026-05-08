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


def _read_text(target: Path) -> str | None:
    """Read *target* as UTF-8 with size + encoding guards.

    Returns the stripped text, or ``None`` when the file is missing,
    unreadable, oversized, or empty after stripping.

    Pulled out of the per-file readers because the I/O guards are
    identical and we'd otherwise duplicate the open/decode/strip
    sequence twice (cf. the workspace_files repetition flagged in
    review).
    """
    if not target.is_file():
        log.debug("_read_text: %s not found", target)
        return None
    try:
        raw = target.read_bytes()
    except OSError as exc:
        log.warning("_read_text: cannot read %s: %s", target, exc)
        return None
    if len(raw) > _MAX_BYTES:
        log.warning("_read_text: %s exceeds %d bytes, truncating", target, _MAX_BYTES)
        raw = raw[:_MAX_BYTES]
    try:
        text = raw.decode("utf-8").strip()
    except UnicodeDecodeError:
        log.warning("_read_text: %s is not valid UTF-8", target)
        return None
    return text or None


def read_agents_md(workspace_root: Path) -> str | None:
    """Return the text of *workspace_root*/AGENTS.md, or ``None`` on failure."""
    return _read_text(workspace_root / _AGENTS_MD)


def read_soul_md(workspace_root: Path) -> str | None:
    """Return the text of *workspace_root*/SOUL.md, or ``None`` on failure.

    SOUL.md is the agent's self-description and is intentionally
    editable by the agent itself — when the agent rewrites it, the next
    turn's system prompt reflects the new identity.
    """
    return _read_text(workspace_root / _SOUL_MD)


def assemble_workspace_prompt(workspace_root: Path) -> str | None:
    """Return the concatenated SOUL.md + AGENTS.md, or ``None`` if both missing.

    Order: SOUL.md first ("who you are"), then a separator, then
    AGENTS.md ("how to operate here").  Either may be missing
    independently; the missing section is omitted with no trace in the
    output so the agent doesn't see "(file missing)" placeholders.
    """
    soul = read_soul_md(workspace_root)
    agents = read_agents_md(workspace_root)
    if soul is None and agents is None:
        return None
    parts: list[str] = []
    if soul is not None:
        parts.append(soul)
    if agents is not None:
        parts.append(agents)
    return "\n\n---\n\n".join(parts)
