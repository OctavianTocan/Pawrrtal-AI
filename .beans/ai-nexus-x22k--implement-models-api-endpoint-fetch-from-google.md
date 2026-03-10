---
# ai-nexus-x22k
title: Implement models API endpoint (fetch from Google)
status: todo
type: task
priority: normal
created_at: 2026-03-09T23:13:30Z
updated_at: 2026-03-09T23:21:44Z
parent: ai-nexus-7k7w
---

Implement GET /api/v1/models by calling Google's Generative AI REST endpoint and filtering to chat-capable models.

## Tasks

- [ ] Use the `google-genai` Python SDK (`from google import genai`) — already installed via Agno. Do NOT use raw httpx.
- [ ] Call `client.models.list()` and filter to models where `supported_actions` contains `"generateContent"`
- [ ] The `name` field is `models/gemini-1.5-flash-001` — strip the `models/` prefix to get the id to pass to `Gemini(id=...)`
- [ ] Add `pageSize=1000` to avoid pagination issues (API defaults to 50 per page)
- [ ] Return a typed response: list of `{id: str, display_name: str}`
- [ ] Add a `ModelInfo` Pydantic schema to `schemas.py`
