---
# pawrrtal-8kvh
title: 'Fix CI: Frontend check + Vitest for Fumadocs PR'
status: completed
type: bug
priority: normal
created_at: 2026-05-14T17:50:21Z
updated_at: 2026-05-14T17:51:35Z
---

PR #201 failing bun run check and Frontend Vitest

\n## Summary of Changes\n- CI ran `bun run generate:docs` from repo root; script lives in `frontend/package.json`. Added `working-directory: frontend` to check + tests workflows.
