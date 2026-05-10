---
# pawrrtal-lq6z
title: Persist rich chat history server-side (thinking, tool calls, timeline, duration)
status: completed
type: task
priority: high
created_at: 2026-05-04T10:41:36Z
updated_at: 2026-05-04T10:50:48Z
---

Make thinking/tool_calls/timeline/duration survive a full page reload by persisting them in the agent session and shipping them through GET /conversations/:id/messages.

## Summary of Changes

### New modules
- backend/app/models.py — added `ChatMessage` ORM model with role/content/thinking/tool_calls/timeline/duration/status + ordinal for stable ordering.
- backend/alembic/versions/003_add_chat_messages_table.py — migration creating the table + indexes.
- backend/app/crud/chat_message.py — `get_messages_for_conversation`, `append_user_message`, `append_assistant_placeholder`, `finalize_assistant_message`. Naive UTC timestamps to match the existing DateTime columns.
- backend/app/core/chat_aggregator.py — `ChatTurnAggregator` mirrors the frontend reducer in chat-reducer.ts so the persisted shape matches what the user saw live (timeline coalescing, error → "Error: ..." content fallback).
- backend/app/schemas.py — `ChatMessageRead` Pydantic model surfaces all rich fields.
- backend/tests/test_chat_aggregator.py — 6 unit tests covering delta concat, thinking coalescing, tool break, tool result, failed-no-content, complete-with-content snapshots.

### Existing modules updated
- backend/app/api/chat.py — writes user prompt + assistant placeholder up front; aggregates events while streaming; opens a fresh DB session in the `finally` block to write the final snapshot (status=complete or failed) so a client disconnect can't corrupt the row. Persistence failures are caught and logged so they don't break the SSE response.
- backend/app/api/conversations.py — `_serialize_chat_history` deleted, `_serialize_chat_message` reads from chat_messages and projects into ChatMessageRead. `/messages` endpoint switched off Agno's `create_history_reader_agent` (which never wrote anything for Claude conversations) onto the new sidecar table.
- backend/tests/test_conversation_helpers.py — replaced obsolete `_extract_message_text` / `_serialize_chat_history` tests with `_serialize_chat_message` tests covering the happy path + an unknown-status fallback.
- backend/tests/test_conversation_api.py — recovery test reframed: a fresh conversation has no rows, so `/messages` returns `[]` without needing to mock anything.

### Verification
- backend pytest: 85/85 passing (added 6 aggregator tests + 2 serializer tests; removed 5 dead `_extract_message_text` tests).
- ruff check + ruff format — clean.
- mypy: 14 → 12 pre-existing errors (my changes net-fixed two; the rest are pre-existing in db.py / users.py / config.py and unrelated).
- frontend tsc/biome/test/build — all clean (60/60).
- alembic upgrade against the dev Postgres tripped on a duplicate table because `Base.metadata.create_all` had already created it from the model edits — stamped to 003 to bring alembic in sync with the actual DDL state. A fresh environment will apply 003 normally.

### What this changes for the user
Hard reload of /c/:id now restores the full chain-of-thought view: brain icon with "Thought for Ns", the chronologically-ordered timeline of thinking + tools, source chips with favicons, and the failed-banner-with-Retry — every piece survives a refresh because the assistant turn is persisted with all of it.
