---
# pawrrtal-n7ip
title: Fix backend dev server app resolution
status: completed
type: bug
priority: normal
created_at: 2026-05-03T08:59:08Z
updated_at: 2026-05-03T09:05:59Z
---

Make bun run dev.ts start FastAPI with an explicit app target so the backend dev server no longer fails with Could not find FastAPI app in module.\n\n- [x] Inspect dev server launcher and backend app entrypoint\n- [x] Update backend dev command\n- [x] Verify backend startup path

## Summary of Changes\n\n- Replaced FastAPI CLI auto-discovery in dev.ts with an explicit uvicorn ASGI target: main:app with --app-dir backend.\n- Verified the backend command reaches Application startup complete.\n- Noted the remaining database retry warning is separate from app discovery.
