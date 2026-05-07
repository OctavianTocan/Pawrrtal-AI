---
# ai-nexus-312l
title: Document the workspace concept end-to-end
status: todo
type: task
priority: normal
created_at: 2026-05-07T16:21:03Z
updated_at: 2026-05-07T16:21:03Z
---

## Goal

There is currently no canonical document explaining what a "workspace" actually is in AI Nexus, how it's created, where its files live, what its lifecycle is, and what consumes it. That gap leads to confusion (e.g. duplicate Workspace rows being silently created, agents not actually consuming the workspace files even though we ship them).

## Required content

A new doc at ``docs/architecture/workspaces.md`` (or extension to an existing arch doc) covering:

### 1. What is a workspace
- DB row in ``workspace`` table: ``id``, ``user_id``, ``name``, ``slug``, ``path``, ``is_default``, ``created_at``.
- Filesystem tree at ``${WORKSPACE_BASE_DIR}/${id}/`` containing seed files (``AGENTS.md``, ``IDENTITY.md``, ``SOUL.md``, ``TOOLS.md``, ``USER.md``) and dirs (``memory/``, ``skills/``, ``artifacts/``).
- Default ``WORKSPACE_BASE_DIR`` is ``/data/workspaces``; local ``.env`` overrides to ``./workspaces`` (relative to the cwd ``just dev`` runs from).

### 2. Lifecycle
- Created on first ``PUT /api/v1/personalization`` call (``ensure_default_workspace`` invoked from ``backend/app/api/personalization.py``).
- Persistence: DB is sqlite locally (``backend/dev.db``) → workspace rows survive across dev-server restarts. Workspace **directories** survive too (they're plain files on disk).
- What happens when the dev server is turned off:
  - Telegram bot stops polling. Inbound Telegram messages aren't processed until the server comes back up; codes already issued continue to be valid until they expire (10 min TTL).
  - Frontend can't reach backend → all queries error.
  - Workspace files are unaffected — they're just files.
  - SQLite db file is unaffected.

### 3. Consumers
- ``app/core/workspace.py`` is the canonical module owning seed + create + lookup.
- Today the LLM providers **don't** read workspace files (Gemini has a ``# TODO: wire filesystem`` placeholder; Claude has a ``cwd`` field that's never set). Cross-reference ai-nexus-dmor for the fix bean.
- Long-term: workspace is the substrate for agent skills, memory, tool outputs, and agentic-stack templates (cross-ref ai-nexus-8kxs).

### 4. Known issues
- Duplicate-default-workspace race (cross-ref ai-nexus-pq4r).
- Agents can't see workspace files (cross-ref ai-nexus-dmor).
- Workspace template direction (cross-ref ai-nexus-8kxs).

### 5. Operations
- How to inspect a workspace as a human (``ls $WORKSPACE_BASE_DIR/<uuid>``).
- How to clean up orphaned directories.
- How to back them up (rsync/object-storage push schedule TBD).
- What files an agent should never write to (``IDENTITY.md`` is set by personalization, ``USER.md`` is regenerated).

## Acceptance

- ``docs/architecture/workspaces.md`` exists, covers all five sections.
- ``CLAUDE.md`` (or its successor) links to it from the architecture rules section.
- Anyone reading the doc can answer: what happens if I turn off the dev server? Do agents have access? Where are the files? When are they created?

## Todos

- [ ] Draft the doc with all five sections above
- [ ] Cross-link to the four related beans
- [ ] Get review from user
- [ ] Link from CLAUDE.md or appropriate index
