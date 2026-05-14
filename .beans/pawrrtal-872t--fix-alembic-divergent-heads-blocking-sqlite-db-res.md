---
# pawrrtal-872t
title: Fix alembic divergent heads blocking SQLite DB reset
status: todo
type: bug
priority: high
created_at: 2026-05-14T08:00:05Z
updated_at: 2026-05-14T08:00:05Z
---

Two alembic heads (000_initial_schema, 011_add_channel_columns_and_attachment) cannot coexist on SQLite. 000_initial_schema opens with 'ALTER TABLE alembic_version ALTER COLUMN version_num TYPE VARCHAR(64)' which SQLite rejects. Today: tests pass because conftest.py uses Base.metadata.create_all instead of alembic; production seeds via Base.metadata.create_all too. Wipe-and-recreate workflow per ADR docs/decisions/2026-05-14-model-id-canonical-format-and-backend-catalog.md §9 currently requires manual workaround (start backend once and let create_all run). Fix options: (a) merge revision, (b) dialect-gate the ALTER COLUMN syntax, (c) stamp + autogenerate.
