---
# pawrrtal-eerx
title: Drop unused ChannelBinding.active_conversation_id column
status: completed
type: task
priority: normal
created_at: 2026-05-16T17:51:53Z
updated_at: 2026-05-16T17:52:55Z
---

The active_conversation_id column on channel_bindings was added in migration 011 but never wired into the routing path — get_or_create_telegram_conversation now uses Conversation.origin_channel. Drop the dead column.

## Todos
- [x] Remove active_conversation_id from ChannelBinding model in backend/app/models.py
- [x] Create alembic migration 014 to drop the column
- [x] Run tests / typecheck

## Summary of Changes

- Removed `active_conversation_id` mapped column from `ChannelBinding` in `backend/app/models.py:208-215`.
- Added migration `backend/alembic/versions/014_drop_active_conversation_id.py` that drops the column on upgrade and re-adds it as a nullable Uuid on downgrade.
- Verified: ruff clean on touched files; 53 channel tests (`test_channels.py`, `test_channels_api.py`, `test_telegram_channel.py`) green.
- Telegram DM routing no longer references this column; resolution now flows through `Conversation.origin_channel == "telegram"` per the prior fix to `_get_or_create_telegram_conv_row`.
- Migration still needs to be applied via `just migrate` (or `uv run alembic upgrade head` in `backend/`).
