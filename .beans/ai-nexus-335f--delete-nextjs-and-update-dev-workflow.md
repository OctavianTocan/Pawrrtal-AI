---
# ai-nexus-335f
title: Delete Next.js and update dev workflow
status: todo
type: task
priority: normal
created_at: 2026-03-26T17:29:12Z
updated_at: 2026-03-26T17:29:12Z
parent: ai-nexus-id67
blocked_by:
    - ai-nexus-91ch
    - ai-nexus-8omf
---

Plan Task 7. Remove all Next.js files and update the dev orchestration.

## Files to Delete
- `frontend/app/` — entire Next.js app directory
- `frontend/next.config.ts`
- `frontend/next-env.d.ts`
- `frontend/proxy.ts`
- `frontend/.next/` — build cache

## Files to Move
- `frontend/app/globals.css` → `frontend/styles/globals.css` (update import in src/index.css)

## Files to Modify
- `dev.ts` — update frontend start command (next dev → vite)
- `Justfile` — update if needed
- `backend/.env` — ensure localhost:3001 in CORS_ORIGINS

## Steps
- [ ] Move globals.css to frontend/styles/globals.css
- [ ] Update src/index.css import path
- [ ] Delete frontend/app/, next.config.ts, next-env.d.ts, proxy.ts, .next/
- [ ] Update dev.ts frontend command
- [ ] Verify: `just dev` starts Vite + FastAPI
- [ ] Verify: login, chat, sidebar all work at http://localhost:3001
- [ ] Verify: `bun run build` produces dist/ with working SPA
- [ ] Verify: `grep -r "next/" frontend/ --include="*.ts" --include="*.tsx"` returns zero
- [ ] Commit
