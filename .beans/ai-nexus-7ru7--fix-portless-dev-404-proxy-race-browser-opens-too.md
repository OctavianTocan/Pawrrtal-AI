---
# ai-nexus-7ru7
title: Fix Portless dev 404 (proxy race / browser opens too early)
status: completed
type: bug
priority: normal
created_at: 2026-05-02T09:22:08Z
updated_at: 2026-05-02T09:22:33Z
---

dev.ts: explicit proxy start, stagger servers, wait for HTTPS ready before open.


## Summary
- Portless 404 with Next Ready was caused by racing proxy registration when two portless children started together.
- dev.ts now runs bunx portless proxy start once, starts frontend first, waits 1.5s, then backend.
- Browser opens only after curl confirms the hostname is no longer the Portless stub (or after 60s with a warning).
- Backend uses bunx portless for consistency.
