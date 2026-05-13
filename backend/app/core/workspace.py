"""Workspace management service.

A workspace is an OpenClaw-style agent home directory.  Each user can have
multiple workspaces; each workspace is a self-contained directory tree that
holds the agent's identity, memory, skills, and generated artifacts.

Standard file layout (inspired by the official OpenClaw workspace structure):

    {workspace_root}/
    ├── AGENTS.md       # Operating instructions / entry point
    ├── SOUL.md         # Agent persona and tone
    ├── IDENTITY.md     # Agent name, emoji, vibe
    ├── USER.md         # Who the human is (from onboarding)
    ├── TOOLS.md        # Local tool conventions
    ├── memory/         # Memory files (daily notes, long-term)
    │   └── .gitkeep
    ├── skills/         # Workspace-scoped skills
    │   └── .gitkeep
    └── artifacts/      # Files the agent has generated
        └── .gitkeep

Seeding happens once: when the user completes the onboarding wizard and the
``PUT /api/v1/personalization`` endpoint is called for the first time.  The
service is idempotent — calling it again on an existing workspace is a no-op.
"""

from __future__ import annotations

import logging
import uuid
from pathlib import Path

from app.core.config import settings
from app.models import UserPersonalization

log = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# File templates
# ---------------------------------------------------------------------------

_AGENTS_MD = """\
# AGENTS.md — Workspace Entry Point

This folder is the agent's home for this workspace.

## Purpose

`AGENTS.md` is the cognitive entry point.  It tells the agent:
- Who it is in this workspace
- How to collaborate with the user
- Where to find deeper operational docs

## Session Startup

On every session start, read:
1. `SOUL.md` — who you are
2. `USER.md` — who you're helping
3. `memory/` — recent daily notes for context

## Memory

Write to `memory/YYYY-MM-DD.md` constantly — every decision, lesson,
build event, or correction goes in before anything else.

## Skills

Custom skills live in `skills/`.  Each skill is a markdown file describing
a repeatable workflow.

## Artifacts

Files the agent generates for the user live in `artifacts/`.

## Scope Discipline

Do exactly what's asked.  Propose adjacent work; never execute it silently.
A question is not an instruction.
"""

_IDENTITY_MD = """\
# IDENTITY.md — Who Am I?

- **Name:** _(set a name for your agent)_
- **Vibe:** _(describe the agent's personality in a few words)_
- **Emoji:** _(pick one)_

---

This file is yours to fill in.  Give your agent a name and a vibe that
feels right for how you work.
"""

_TOOLS_MD = """\
# TOOLS.md — Tool Conventions

Local tool conventions for this workspace.

## File Access

The agent has direct read/write access to this workspace directory.

## Memory

- Daily notes: `memory/YYYY-MM-DD.md`
- Long-term memory index: `memory/MEMORY.md` _(created automatically)_

## Skills

- List available skills with the skill workshop tool.
- Workspace-scoped skills live in `skills/`.
"""

_PERSONALITY_SOULS: dict[str, str] = {
    "analytical": """\
# SOUL.md — Who You Are

You are a precise, analytical assistant.  You think in systems, surface
trade-offs, and lead with evidence.  Your default mode is structured and
calm — bullet points when they help, prose when it flows better.

You are direct.  You flag uncertainty clearly.  You do not pad answers
with enthusiasm or filler.  You are here to help the user think, decide,
and ship.
""",
    "creative": """\
# SOUL.md — Who You Are

You are an imaginative, generative assistant.  You bring unexpected angles,
lateral thinking, and fresh framings to every problem.  You are comfortable
with ambiguity and enjoy exploring the edges.

You are warm and enthusiastic but not sycophantic.  You share genuine
opinions.  You know when to stop generating and help the user land the idea.
""",
    "direct": """\
# SOUL.md — Who You Are

You are a no-nonsense assistant.  Short sentences.  Strong verbs.  You give
the answer first, the reasoning second, and you stop when you're done.

You do not hedge.  You do not soften.  When you are uncertain you say so
plainly.  You treat the user as a capable adult.
""",
    "balanced": """\
# SOUL.md — Who You Are

You are a well-rounded assistant — analytical when precision matters, creative
when exploration helps, direct when time is short.  You read the situation
and match accordingly.

You are reliable, curious, and honest.  You do not perform enthusiasm or
false confidence.  You are here to be genuinely useful.
""",
}

_DEFAULT_SOUL = _PERSONALITY_SOULS["balanced"]


def _build_user_md(p: UserPersonalization | None) -> str:
    if p is None:
        return "# USER.md — About You\n\n_(Fill in your details here.)_\n"

    lines = ["# USER.md — About You", ""]

    if p.name:
        lines.append(f"- **Name:** {p.name}")
    if p.role:
        lines.append(f"- **Role:** {p.role}")
    if p.company_website:
        lines.append(f"- **Company / Website:** {p.company_website}")
    if p.linkedin:
        lines.append(f"- **LinkedIn:** {p.linkedin}")
    if p.goals:
        goals_str = ", ".join(p.goals) if isinstance(p.goals, list) else str(p.goals)
        lines.append(f"- **Goals:** {goals_str}")
    if p.custom_instructions:
        lines += ["", "## Custom Instructions", "", p.custom_instructions]

    lines += [
        "",
        "---",
        "",
        "_Update this file as you evolve what you need from your agent._",
        "",
    ]
    return "\n".join(lines)


def _build_soul_md(p: UserPersonalization | None) -> str:
    if p is None or not p.personality:
        return _DEFAULT_SOUL
    return _PERSONALITY_SOULS.get(p.personality.lower(), _DEFAULT_SOUL)


# ---------------------------------------------------------------------------
# Filesystem helpers
# ---------------------------------------------------------------------------


def _workspace_path(workspace_id: uuid.UUID) -> Path:
    """Return the absolute path for a workspace directory."""
    return Path(settings.workspace_base_dir) / str(workspace_id)


def seed_workspace(
    workspace_id: uuid.UUID,
    personalization: UserPersonalization | None = None,
) -> Path:
    """Create the workspace directory tree and write seed files.

    Idempotent — existing files are not overwritten, so re-running after a
    partial seed is safe.  New directories are always created.

    Returns the workspace root path.
    """
    root = _workspace_path(workspace_id)

    # Create standard subdirectories.
    for subdir in ("memory", "skills", "artifacts"):
        (root / subdir).mkdir(parents=True, exist_ok=True)
        gitkeep = root / subdir / ".gitkeep"
        if not gitkeep.exists():
            gitkeep.touch()

    # Write seed files — skip if already present so edits aren't clobbered.
    seed_files: dict[str, str] = {
        "AGENTS.md": _AGENTS_MD,
        "IDENTITY.md": _IDENTITY_MD,
        "TOOLS.md": _TOOLS_MD,
        "SOUL.md": _build_soul_md(personalization),
        "USER.md": _build_user_md(personalization),
    }
    for filename, content in seed_files.items():
        target = root / filename
        if not target.exists():
            target.write_text(content, encoding="utf-8")

    return root
