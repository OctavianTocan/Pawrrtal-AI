---
# ai-nexus-vj5l
title: Configure Production Environment Variables
status: scrapped
type: task
priority: normal
tags:
    - Deployment
    - Sprint 2
created_at: 2026-02-27T15:02:17Z
updated_at: 2026-03-07T22:27:08Z
---

Notion Task #65 — Configure environment variables for production deployment.



## Railway-Specific Patterns (from Agno Template)

Config should support building DB URL from individual env vars that Railway auto-injects:
- DB_DRIVER (default: postgresql+asyncpg)
- DB_HOST, DB_PORT, DB_USER, DB_PASS, DB_DATABASE
- Build URL: `{driver}://{user}:{password}@{host}:{port}/{database}`

Also need:
- CORS_ORIGINS (comma-separated list)
- AUTH_SECRET
- RUNTIME_ENV (dev/prod)

## Reasons for Scrapping

Merged into ai-nexus-sx1v (Set Up Production Deployment). Env var configuration is part of the deployment setup, not a separate task.
