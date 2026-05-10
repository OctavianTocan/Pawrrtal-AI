---
# pawrrtal-inwh
title: 'Sprint 0: PostgreSQL Migration'
status: scrapped
type: milestone
priority: critical
created_at: 2026-03-19T23:09:17Z
updated_at: 2026-05-07T16:30:45Z
---

# Sprint 0: PostgreSQL Migration

Migrate the entire backend from SQLite (`aiosqlite`) to PostgreSQL, connecting to the existing Railway PostgreSQL instance. This is foundational infrastructure that must land before any further backend work ships to production.

## Context

The backend currently uses a single SQLite file (`agno.db`) accessed through two different drivers:
- **SQLAlchemy async** (`sqlite+aiosqlite:///./agno.db`) — handles app tables: `user`, `conversations`, `user_preferences`, `api_keys`
- **Agno's SqliteDb** (`SqliteDb(db_file="agno.db")`) — handles agent session storage (`agno_sessions`)

SQLite is ephemeral on Railway (data lost on every redeploy), making production persistence impossible. A PostgreSQL instance already exists on Railway and will serve as the single database for both app tables and Agno session storage.

## Goals
- Single PostgreSQL database for everything (app ORM + Agno sessions)
- One `DATABASE_URL` env var, normalized in code for both drivers
- Local dev connects directly to Railway dev instance (no local Postgres needed)
- Zero data migration needed (no production data exists yet in SQLite)

## Key Technical Decisions
- **Driver**: `psycopg[binary]` (v3) — handles both SQLAlchemy async and Agno's sync `PostgresDb` via the same `postgresql+psycopg://` prefix
- **Agno storage class**: `agno.db.postgres.PostgresDb` (sync, matches current sync usage in `agents.py`)
- **No async Agno storage** needed yet — current agent code is sync
- **Local dev**: Connect to Railway PostgreSQL directly (no Docker/Homebrew Postgres)
