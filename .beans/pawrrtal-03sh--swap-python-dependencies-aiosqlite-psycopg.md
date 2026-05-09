---
# pawrrtal-03sh
title: 'Swap Python dependencies: aiosqlite → psycopg'
status: todo
type: task
priority: high
created_at: 2026-03-19T23:10:10Z
updated_at: 2026-03-19T23:10:10Z
parent: pawrrtal-inwh
---

## Description

Replace the SQLite async driver with the PostgreSQL driver in `backend/pyproject.toml`.

## Changes

**File: `backend/pyproject.toml`**
- Remove: `aiosqlite>=0.22.1`
- Add: `psycopg[binary]>=3.2.0` (provides both sync and async PostgreSQL access via psycopg v3)

## Why psycopg[binary]

- `psycopg` v3 is what Agno's `PostgresDb` uses internally (`postgresql+psycopg://` prefix)
- SQLAlchemy's async engine also supports psycopg v3 in async mode
- The `[binary]` extra bundles the C extension for better performance — no need for system-level `libpq`
- One driver covers both our SQLAlchemy async usage AND Agno's sync storage

## Acceptance Criteria
- [ ] `aiosqlite` removed from dependencies
- [ ] `psycopg[binary]` added to dependencies
- [ ] `uv sync` runs cleanly with no conflicts
- [ ] No remaining imports of `aiosqlite` anywhere in the codebase
