---
# ai-nexus-dbcl
title: Update agent factory for multi-model support
status: todo
type: task
priority: high
tags:
    - Sprint-B
    - backend
created_at: 2026-02-27T16:09:41Z
updated_at: 2026-03-09T23:20:15Z
parent: ai-nexus-7k7w
---

Update the agent factory and chat endpoint to accept a dynamic model ID, so the user's selected model is used per request. Only Gemini is supported for now — no MODEL_MAP or multi-provider complexity needed yet.

## Tasks

- [ ] Add `model_id: str | None = None` to `ChatRequest` schema (defaults to `gemini-2.0-flash` if not provided)
- [ ] Update `create_agent()` signature to accept `model_id: str`
- [ ] Replace the hardcoded `Gemini(id="gemini-3-flash-preview")` with `Gemini(id=model_id)`
- [ ] In the chat endpoint, read `model_id` from the request and pass it to `create_agent()`
