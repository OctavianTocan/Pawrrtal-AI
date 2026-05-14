---
# pawrrtal-vjwc
title: Apply pending Alembic migrations for conversation channel columns
status: completed
type: bug
priority: normal
created_at: 2026-05-12T16:59:47Z
updated_at: 2026-05-12T17:02:05Z
---

Local DB was at 005; SQLAlchemy model expects origin_channel from 011. Run alembic upgrade head.



## Summary of Changes

- Root cause: `alembic_version` was stuck at `005_add_projects` while ORM/models included columns from migration `011_add_channel_columns_and_attachment`. DB had partial manual/schema drift (tables through ~008 without Alembic progression).
- Deduped duplicate default workspaces for one user so partial unique index `uq_workspaces_one_default_per_user` could be created.
- Applied equivalent of migrations 009–011 manually (index, drop `api_keys`, add conversation/channel_bindings/chat_messages columns + FK on `active_conversation_id`).
- Widened `alembic_version.version_num` from VARCHAR(32) to VARCHAR(64) (revision IDs exceed 32 chars) and stamped `011_add_channel_columns_and_attachment`.
- Verified `alembic current` = 011 and `origin_channel` columns exist.

Note: Fresh linear upgrades should use `alembic upgrade 011_add_channel_columns_and_attachment` when multiple heads exist (`000_initial_schema` vs main chain); merge at 010 requires both branches applied before upgrade.
