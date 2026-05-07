---
# ai-nexus-bl8g
title: Migrate Agno agent storage from SqliteDb to PostgresDb
status: scrapped
type: task
priority: high
created_at: 2026-03-19T23:10:10Z
updated_at: 2026-05-07T16:25:30Z
parent: ai-nexus-inwh
blocked_by:
    - ai-nexus-cx7v
---

## Description

Replace Agno's `SqliteDb` with `PostgresDb` in `app/core/agents.py` so agent sessions are stored in the shared PostgreSQL database.

## Current State

```python
# app/core/agents.py
from agno.db.sqlite.sqlite import SqliteDb
agno_db = SqliteDb(db_file="agno.db")
```

This creates Agno's `agno_sessions` table in the local SQLite file.

## Changes

**File: `app/core/agents.py`**
- Replace `SqliteDb` import with `PostgresDb` from `agno.db.postgres`
- Initialize with the sync DB URL from settings:

```python
from agno.db.postgres import PostgresDb
from app.core.config import settings

agno_db = PostgresDb(db_url=settings.db_url_sync)
```

- All agent creation functions (`create_agent`, `create_history_reader_agent`, `create_utility_agent`) continue to use `agno_db` — no changes needed to their signatures or usage

## What Agno's PostgresDb Does
- Auto-creates an `agno_sessions` table in the target database
- Stores session data as JSONB (conversation history, agent state, run metadata)
- Uses `psycopg` (v3) under the hood via SQLAlchemy
- Table lives alongside our app tables (`user`, `conversations`, etc.) with no conflicts

## Acceptance Criteria
- [ ] `SqliteDb` import fully removed from `agents.py`
- [ ] `PostgresDb` initialized with settings-based URL
- [ ] Agent creation functions work unchanged
- [ ] `agno_sessions` table appears in PostgreSQL after first agent run
- [ ] Chat history persists across agent invocations

## Reasons for Scrapping

User confirmed 2026-05-07: nothing more is being done with Agno. `app/core/agents.py` and `app/core/providers/agno_provider.py` are dead code and excluded from mypy in commit `e49d664`. The provider direction is Gemini + Claude. Closing the Agno cluster: ai-nexus-bl8g, ai-nexus-d2ke, ai-nexus-cocq, ai-nexus-7xc0.
