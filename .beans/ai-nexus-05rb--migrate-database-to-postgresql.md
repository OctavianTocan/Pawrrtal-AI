---
# ai-nexus-05rb
title: Migrate Database to PostgreSQL
status: todo
type: task
priority: high
tags:
    - Deployment
    - Sprint 2
created_at: 2026-02-27T15:02:15Z
updated_at: 2026-03-04T10:01:52Z
---

Notion Task #63 — Migrate the database from SQLite to PostgreSQL for production.



## Priority Bump Rationale

Railway provides Postgres natively — the Agno Railway template assumes PostgresDb everywhere (agent sessions + knowledge). Both our app DB (SQLAlchemy) and Agno storage need to switch. Should be done before deployment.

## Scope

- Switch SQLAlchemy engine from sqlite+aiosqlite to postgresql+asyncpg
- Update config.py to support Railway's DB env vars (DB_HOST, DB_PORT, DB_USER, DB_PASS, DB_DATABASE)
- Keep SQLite as dev default, Postgres for prod
