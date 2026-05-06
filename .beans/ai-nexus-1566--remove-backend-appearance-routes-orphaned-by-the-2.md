---
# ai-nexus-1566
title: Remove backend appearance routes orphaned by the 2026-05-06 rip
status: todo
type: task
priority: normal
created_at: 2026-05-06T12:54:33Z
updated_at: 2026-05-06T12:54:33Z
parent: ai-nexus-9kov
---

After the frontend appearance system was ripped on 2026-05-06, the backend routes that backed it are orphaned. Delete or repurpose:

- `backend/app/api/` — appearance endpoints (`GET` / `PUT /api/v1/appearance`).
- `backend/app/models.py` — `appearance_settings` table or whatever stores it. Plus any related Pydantic schemas in `backend/app/schemas.py`.
- `backend/app/crud/` — appearance CRUD module.
- `backend/tests/` — fixtures and integration tests for appearance routes.
- Alembic migration: drop the table OR (preferred) leave the table and add a follow-up migration that removes it once the rebuild settles. Decide between hard delete now and deferred deletion.

Coordinate with the customization-scope decision (sub-bean) — if the rebuild keeps user-customizable theming, this work becomes "refactor the schema" instead of "delete it."

## TODO
- [ ] Decide hard-delete vs deferred-delete
- [ ] Remove (or refactor) routes / schemas / CRUD / tests
- [ ] Drop or migrate the appearance-settings table
