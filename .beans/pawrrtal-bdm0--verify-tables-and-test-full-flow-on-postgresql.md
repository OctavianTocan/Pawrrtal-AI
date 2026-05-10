---
# pawrrtal-bdm0
title: Verify tables and test full flow on PostgreSQL
status: todo
type: task
priority: high
created_at: 2026-03-19T23:10:10Z
updated_at: 2026-03-21T17:42:48Z
parent: pawrrtal-inwh
blocked_by:
    - pawrrtal-bl8g
    - pawrrtal-vf3i
---

## Description

End-to-end verification that both the SQLAlchemy app tables and Agno's session table are created correctly in PostgreSQL and that the full user flow works.

## Verification Checklist

### Table creation
- [ ] `user` table exists with correct columns (fastapi-users schema)
- [ ] `conversations` table exists with correct columns and FK to user
- [ ] `user_preferences` table exists with correct columns and FK to user
- [ ] `api_keys` table exists with encrypted_key column working
- [ ] `agno_sessions` table exists (created by Agno's PostgresDb)

### Auth flow
- [ ] User registration works (with invite code)
- [ ] User login works
- [ ] Cookie-based auth persists across requests
- [ ] Session survives backend restart (no more ephemeral SQLite)

### Chat flow
- [ ] Create conversation → row appears in `conversations` table
- [ ] Send message → Agno processes and stores session in `agno_sessions`
- [ ] Chat history loads correctly on conversation reopen
- [ ] Multiple conversations for same user work independently

### Data integrity
- [ ] `StringEncryptedType` (Fernet) works correctly on PostgreSQL for API keys
- [ ] UUID primary keys work (PostgreSQL has native UUID support — should be fine)
- [ ] DateTime columns store/retrieve correctly

## How to Test
1. Start backend locally pointed at Railway PostgreSQL
2. Run through the flows above manually via the frontend or API docs (`/docs`)
3. Optionally: inspect tables directly via `psql` or Railway's data browser

## Acceptance Criteria
- [ ] All tables created without errors
- [ ] Full auth + chat flow works end-to-end
- [ ] Data persists across backend restarts
- [ ] No SQLite references remain in the codebase
