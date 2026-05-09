---
# pawrrtal-bsgu
title: Make CORS Origins Configurable
status: todo
type: task
priority: normal
tags:
    - Backend
    - Sprint 2
created_at: 2026-02-27T15:02:18Z
updated_at: 2026-03-04T10:02:02Z
blocked_by:
    - pawrrtal-vj5l
---

Notion Task #38 — Make CORS origins configurable instead of hardcoded.



## Note

Blocker for Railway deployment — hardcoded localhost:3001 won't work in prod. Should read from CORS_ORIGINS env var (part of pawrrtal-vj5l).
