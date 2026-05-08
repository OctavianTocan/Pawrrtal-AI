---
# pawrrtal-7xpf
title: Remove Portless from local dev — back to plain localhost
status: completed
type: task
priority: normal
created_at: 2026-05-02T20:50:46Z
updated_at: 2026-05-07T16:21:23Z
---

Strip portless wiring from dev.ts, package.json, frontend/package.json, .env files, dev-login proxy, AGENTS.md. Both services run on plain localhost (3001 frontend, 8000 backend).

## Summary of Changes

Verified 2026-05-07: `grep -rn 'portless\|Portless'` across backend/.env, backend/app/, frontend/lib/, and frontend/.env* returns zero hits. The CLAUDE.md memory note also confirms current dev runs on plain localhost (`Next.js on http://localhost:3001, FastAPI on http://localhost:8000`). The work this bean tracked is in main.
