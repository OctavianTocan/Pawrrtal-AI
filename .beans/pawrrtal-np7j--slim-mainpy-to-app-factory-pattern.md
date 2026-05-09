---
# pawrrtal-np7j
title: Slim main.py to app factory pattern
status: completed
type: task
priority: high
tags:
    - Sprint-A
    - backend
created_at: 2026-02-27T16:09:27Z
updated_at: 2026-03-04T09:53:31Z
parent: pawrrtal-pva0
---

Rewrite main.py as create_app() factory. Only app creation, middleware, and router includes. Update db.py and users.py to use config module.

## Plan

Do all three beans together as one coupled refactor (no logic changes, pure reorganization):

### Files to create
1. `app/core/agents.py` — move `agno_db` + extract `create_agent(user_id, conversation_id)` factory
2. `app/api/conversations.py` — move 5 conversation endpoints, swap `@app.X` → `@router.X`
3. `app/api/chat.py` — move SSE chat endpoint, import `create_agent` from `core/agents.py`
4. `app/api/router.py` — combine both routers into `api_router`
5. `app/api/__init__.py` — empty, makes it a package

### main.py becomes
- `create_app()` factory with lifespan, middleware, and router includes only
- Drop `load_dotenv()` (handled by config.py)

### Related beans
- pawrrtal-dsg3 (extract conversation routes)
- pawrrtal-fxhs (extract chat endpoint + agent factory)

## Summary of Changes

Already implemented in commit d0a4f68. main.py now uses create_app() factory pattern with middleware and router includes.
