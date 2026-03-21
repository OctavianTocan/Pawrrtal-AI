---
# ai-nexus-vf3i
title: Update Railway config and env vars for PostgreSQL
status: todo
type: task
priority: high
created_at: 2026-03-19T23:10:10Z
updated_at: 2026-03-21T17:42:43Z
parent: ai-nexus-inwh
blocked_by:
    - ai-nexus-cx7v
---

## Description

Ensure the Railway deployment is properly configured to inject the PostgreSQL connection URL and that the backend picks it up correctly.

## Changes

**Railway environment variables:**
- Verify `DATABASE_URL` is set in the Railway service (Railway auto-injects this when a Postgres plugin is attached — but confirm it's available to the backend service)
- Add any missing env vars to Railway dashboard if needed

**File: `backend/railway.toml`**
- No changes expected — the start command (`uvicorn main:app --host 0.0.0.0 --port $PORT`) should work as-is
- Verify health check still works with PostgreSQL

**File: `.env` (local development)**
- Add `DATABASE_URL` pointing to Railway's external PostgreSQL URL (the public one, not the internal `*.railway.internal` one, since we're connecting from outside Railway's network)
- Format: `postgresql://postgres:<password>@<host>.railway.app:<port>/railway`

**File: `.env.example`**
- Document the `DATABASE_URL` format clearly with comments explaining Railway vs local usage

## Important Notes
- Railway provides TWO PostgreSQL URLs:
  - **Internal** (`*.railway.internal`) — only works from within Railway's network (service-to-service)
  - **External/Public** — works from anywhere, including local dev
- The deployed backend service should use the internal URL (faster, no egress cost)
- Local dev should use the external/public URL
- Railway's `DATABASE_URL` variable typically contains the internal URL — the deployed service gets this automatically
- For local `.env`, we manually set `DATABASE_URL` to the external URL

## Acceptance Criteria
- [ ] Railway service has `DATABASE_URL` available
- [ ] Deployed backend connects to PostgreSQL successfully
- [ ] Local `.env` has the external PostgreSQL URL
- [ ] Local dev connects to Railway PostgreSQL successfully
- [ ] `.env.example` documents both URL formats
