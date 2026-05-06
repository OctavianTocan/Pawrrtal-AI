---
# ai-nexus-gvsb
title: 'Backend pytest fails to collect: test_providers_and_schemas.py imports stale GeminiLLM'
status: todo
type: bug
priority: high
tags:
    - tests
    - backend
    - stale-test
created_at: 2026-05-06T17:09:28Z
updated_at: 2026-05-06T17:09:28Z
---

## Problem

`uv run pytest --collect-only` errors out:

```
ERROR collecting tests/test_providers_and_schemas.py
ImportError: cannot import name `GeminiLLM` from `app.core.providers.agno_provider`
```

`backend/tests/test_providers_and_schemas.py:8` imports `GeminiLLM` from `app.core.providers.agno_provider`, but that symbol no longer exists in the current implementation. The test file was not updated when the provider module was refactored.

This blocks the whole pytest suite (collection error fails fast — none of the 144 collected tests run).

## Why it surfaced now

Discovered while wiring `tests.yml` into CI (`ai-nexus-anju`). The new workflow runs `uv run pytest`, which now correctly fails — same outcome as on a developer machine, just nobody had been running it.

## Plan

- [ ] Read `backend/app/core/providers/agno_provider.py` and identify the current Gemini-related symbol (likely renamed or moved to a different module under `core/providers/`)
- [ ] Either update `tests/test_providers_and_schemas.py` import to the new name, or delete the file if the test is obsolete
- [ ] Confirm `uv run pytest --collect-only` succeeds
- [ ] Confirm `uv run pytest` runs and surfaces only legitimate failures (if any)

## Notes

- This bean blocks the backend job in `tests.yml` from going green. Until it lands, `tests.yml` will be red on every PR that touches `backend/**`.
