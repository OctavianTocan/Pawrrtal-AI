---
# pawrrtal-4chl
title: Add preferred_model to UserPreferences and settings endpoint
status: todo
type: task
created_at: 2026-03-09T23:20:21Z
updated_at: 2026-03-09T23:20:21Z
parent: pawrrtal-7k7w
---

Add preferred_model field to UserPreferences and expose GET/PATCH /api/v1/settings so the frontend can persist the user's selected model across sessions.

## Tasks

- [ ] Add `preferred_model: str | None` column to `UserPreferences` model in `models.py`
- [ ] Add `UserPreferencesRead` and `UserPreferencesUpdate` Pydantic schemas to `schemas.py`
- [ ] Create `app/api/settings.py` with GET /api/v1/settings (returns current preferences) and PATCH /api/v1/settings (updates fields)
- [ ] Create `app/crud/settings.py` with get and upsert functions for UserPreferences
- [ ] Register the settings router in main.py
