---
# pawrrtal-cx7v
title: Update Settings and db.py for PostgreSQL URL handling
status: todo
type: task
priority: high
created_at: 2026-03-19T23:10:10Z
updated_at: 2026-03-21T17:42:42Z
parent: pawrrtal-inwh
blocked_by:
    - pawrrtal-03sh
---

## Description

Update the app configuration to accept a PostgreSQL connection URL and normalize it for both SQLAlchemy async and Agno sync usage.

## Current State

- `app/core/config.py`: `db_url` defaults to `"sqlite+aiosqlite:///./agno.db"`
- `app/db.py`: passes `settings.db_url` directly to `create_async_engine()`
- `.env.example`: has a commented-out `DATABASE_URL` line

## Changes

**File: `app/core/config.py`**
- Rename field from `db_url` to `database_url` (matches Railway's convention of injecting `DATABASE_URL`)
- Remove the SQLite default — make it required (no sensible default for PostgreSQL)
- Add a helper property that ensures the URL has the `postgresql+psycopg://` prefix (Railway gives bare `postgresql://`)

```python
@property
def db_url_async(self) -> str:
    """SQLAlchemy async engine URL — ensures postgresql+psycopg:// prefix."""
    url = self.database_url
    if url.startswith("postgresql://"):
        url = url.replace("postgresql://", "postgresql+psycopg://", 1)
    return url

@property
def db_url_sync(self) -> str:
    """Agno PostgresDb URL — same prefix works for sync psycopg."""
    return self.db_url_async  # psycopg handles both sync and async
```

**File: `app/db.py`**
- Change `create_async_engine(settings.db_url)` → `create_async_engine(settings.db_url_async)`

**File: `.env.example`**
- Replace the commented SQLite line with a required `DATABASE_URL` example pointing at Railway format

## Acceptance Criteria
- [ ] `database_url` field in Settings reads from `DATABASE_URL` env var
- [ ] `db_url_async` property normalizes the prefix correctly
- [ ] `db_url_sync` property available for Agno usage
- [ ] `app/db.py` uses the new async property
- [ ] `.env.example` updated with PostgreSQL example URL
- [ ] App fails fast with a clear error if `DATABASE_URL` is not set
