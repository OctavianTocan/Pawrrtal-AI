---
# pawrrtal-sx1v
title: Set Up Production Deployment
status: scrapped
type: feature
priority: normal
tags:
    - Deployment
    - Sprint 2
created_at: 2026-02-27T15:02:15Z
updated_at: 2026-05-07T16:33:41Z
blocked_by:
    - pawrrtal-47mi
    - pawrrtal-05rb
    - pawrrtal-vj5l
    - pawrrtal-tl20
---

Notion Task #62 — Set up production deployment infrastructure. Merged from pawrrtal-47mi and pawrrtal-vj5l.

## Deliverables

- [ ] `Dockerfile` — Python 3.13 base, non-root user, uv pip sync
- [ ] `railway.json` — Dockerfile builder, uvicorn start command, resource limits
- [ ] `scripts/entrypoint.sh` — container entrypoint with DB wait logic
- [ ] `.dockerignore` — exclude dev files from image
- [ ] Env var config: support Railway DB URL building from individual vars (DB_HOST, DB_PORT, etc.)
- [ ] CORS_ORIGINS, AUTH_SECRET, RUNTIME_ENV env vars
