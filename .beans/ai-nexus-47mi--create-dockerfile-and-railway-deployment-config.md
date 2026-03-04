---
# ai-nexus-47mi
title: Create Dockerfile and Railway deployment config
status: todo
type: task
priority: normal
created_at: 2026-03-04T10:02:11Z
updated_at: 2026-03-04T10:02:21Z
blocked_by:
    - ai-nexus-05rb
    - ai-nexus-vj5l
    - ai-nexus-tl20
---

Create Dockerfile, railway.json, scripts/entrypoint.sh, and .dockerignore for Railway deployment.

## Deliverables

- `Dockerfile` — Python 3.13 base, non-root user, uv pip sync for deps, PYTHONPATH=/app
- `railway.json` — Dockerfile builder, `uvicorn app.main:app --host 0.0.0.0 --port 8000`, resource limits
- `scripts/entrypoint.sh` — DB readiness wait, env printing option, graceful startup
- `.dockerignore` — exclude .env, .venv, __pycache__, .git, frontend/, tests/

## Reference

Based on agno-agi/agentos-railway-template patterns.
