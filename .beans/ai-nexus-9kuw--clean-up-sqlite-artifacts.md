---
# ai-nexus-9kuw
title: Clean up SQLite artifacts
status: todo
type: task
priority: normal
created_at: 2026-03-19T23:10:10Z
updated_at: 2026-03-19T23:10:10Z
parent: ai-nexus-inwh
---

## Description

Remove all traces of SQLite from the codebase once PostgreSQL is confirmed working.

## Changes
- [ ] Delete `agno.db` file from the repository (if tracked) and add to `.gitignore`
- [ ] Remove any SQLite-specific comments in code
- [ ] Ensure no conditional SQLite/Postgres logic crept in — should be Postgres-only
- [ ] Update `backend/README.md` (if it exists) to reflect PostgreSQL requirement
- [ ] Verify `aiosqlite` is not in `uv.lock` after dependency removal

## Acceptance Criteria
- [ ] `git grep -i sqlite` returns zero results in `backend/` (excluding `.venv/`)
- [ ] No `*.db` files in the working directory
- [ ] `.gitignore` includes `*.db` as a safety net
