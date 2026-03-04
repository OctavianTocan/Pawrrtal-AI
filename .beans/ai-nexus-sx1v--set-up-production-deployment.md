---
# ai-nexus-sx1v
title: Set Up Production Deployment
status: todo
type: task
priority: normal
tags:
    - Deployment
    - Sprint 2
created_at: 2026-02-27T15:02:15Z
updated_at: 2026-03-04T10:02:23Z
blocked_by:
    - ai-nexus-47mi
    - ai-nexus-05rb
    - ai-nexus-vj5l
    - ai-nexus-tl20
---

Notion Task #62 — Set up production deployment infrastructure.



## Scoped Deliverables (from Agno Railway Template)

- `Dockerfile` — based on Python 3.13, non-root user, uv pip sync
- `railway.json` — Dockerfile builder, uvicorn start command, resource limits
- `scripts/entrypoint.sh` — container entrypoint with DB wait logic
- `.dockerignore` — exclude dev files from image
- Blocked by: PostgreSQL migration (ai-nexus-05rb), env var config (ai-nexus-vj5l), health check (ai-nexus-tl20)
