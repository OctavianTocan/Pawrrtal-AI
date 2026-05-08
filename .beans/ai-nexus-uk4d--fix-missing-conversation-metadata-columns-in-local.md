---
# pawrrtal-uk4d
title: Fix missing conversation metadata columns in local database
status: completed
type: bug
priority: normal
created_at: 2026-05-03T13:37:18Z
updated_at: 2026-05-03T13:40:28Z
---

GET /api/v1/conversations fails with psycopg UndefinedColumn because the conversations table is missing is_archived/is_flagged/is_unread/status/model_id while the SQLAlchemy model queries them.

- [x] Confirm model and Alembic migration chain for conversation metadata columns
- [x] Confirm local database migration state
- [x] Apply or repair the missing schema changes
- [x] Verify conversations endpoint/query no longer fails
- [x] Complete this bean with a summary

## Summary of Changes

Updated Alembic to use the same database URL normalization as the FastAPI app, applied the pending conversation metadata migrations to the local database, and verified the missing columns plus the failing Conversation ORM query now work.
