---
# pawrrtal-mjru
title: Set up pytest infrastructure and write first test suite
status: completed
type: task
priority: high
created_at: 2026-03-04T23:43:58Z
updated_at: 2026-05-07T16:32:26Z
---

## Goal
No-mock test suite using real deps (in-memory SQLite, real FastAPI TestClient, fast LLM model for integration tests).

## Tasks
- [ ] Add pytest-asyncio and httpx to dev deps
- [ ] Create backend/tests/ directory with conftest.py
- [ ] conftest: in-memory async SQLite engine, test user fixture, async session fixture
- [ ] conftest: FastAPI TestClient via create_app() factory
- [ ] Add test_model_id to Settings (default gemini-3-flash-preview, override with fast model in tests)
- [ ] Wire agent factories to read model ID from settings instead of hardcoding
- [ ] Test: Settings loads from env, validates required fields, is_production works
- [ ] Test: create_app() returns FastAPI with all expected routes mounted
- [ ] Test: agent factories construct agents with correct attributes
- [ ] Test: conversation CRUD (create, get, list, update title, ownership isolation)
- [ ] Test: conversation routes (401 without auth, 404 wrong user, happy paths)
- [ ] Test: chat SSE streaming format and done sentinel
- [ ] Add `just test` command to Justfile
