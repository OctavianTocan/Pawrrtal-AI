---
# ai-nexus-d2ke
title: Migrate Agno storage from SqliteDb to PostgresDb
status: todo
type: task
priority: high
created_at: 2026-03-04T10:02:16Z
updated_at: 2026-03-04T10:02:22Z
blocked_by:
    - ai-nexus-05rb
---

Switch Agno's agent session/memory storage from SqliteDb to PostgresDb.

## Context

Currently using `agno.db.sqlite.SqliteDb(db_file="agno.db")` for agent message history. The Agno Railway template uses `agno.db.postgres.PostgresDb` everywhere. For Railway, both our app DB and Agno's storage should use the same Postgres instance.

## Scope

- Replace SqliteDb with PostgresDb in agent factory (app/core/agents.py)
- Reuse DB URL from config module
- Keep SqliteDb as fallback for local dev if needed
- Depends on: PostgreSQL migration (ai-nexus-05rb)
