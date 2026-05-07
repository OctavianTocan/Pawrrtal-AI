---
# ai-nexus-sx1v
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
    - ai-nexus-47mi
    - ai-nexus-05rb
    - ai-nexus-vj5l
    - ai-nexus-tl20
---

Notion Task #62 — Set up production deployment infrastructure. Merged from ai-nexus-47mi and ai-nexus-vj5l.

## Deliverables

- [ ] `Dockerfile` — Python 3.13 base, non-root user, uv pip sync
- [ ] `railway.json` — Dockerfile builder, uvicorn start command, resource limits
- [ ] `scripts/entrypoint.sh` — container entrypoint with DB wait logic
- [ ] `.dockerignore` — exclude dev files from image
- [ ] Env var config: support Railway DB URL building from individual vars (DB_HOST, DB_PORT, etc.)
- [ ] CORS_ORIGINS, AUTH_SECRET, RUNTIME_ENV env vars
