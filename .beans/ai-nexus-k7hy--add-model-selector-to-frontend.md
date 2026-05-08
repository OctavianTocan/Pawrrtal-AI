---
# pawrrtal-k7hy
title: Wire existing ModelSelector into ChatContainer
status: todo
type: task
priority: high
tags:
    - Sprint-B
    - frontend
created_at: 2026-02-27T16:09:41Z
updated_at: 2026-03-10T19:26:02Z
parent: pawrrtal-7k7w
blocked_by:
    - pawrrtal-x22k
    - pawrrtal-4chl
    - pawrrtal-dbcl
---

The ModelSelector component suite already exists in `components/ai-elements/model-selector.tsx`. This task wires it into the app with real data and persistence.

Depends on: pawrrtal-x22k (models API), pawrrtal-4chl (settings endpoint), pawrrtal-dbcl (chat accepts model_id).

## Tasks

- [ ] Implement `use-models.ts` hook (file exists but entire body is commented out — needs full implementation using `useAuthedQuery<ModelInfo[]>`)
- [ ] On app load, fetch user settings and initialize model selector to `preferred_model` (fallback: `gemini-2.0-flash`)
- [ ] Wire ModelSelector into ChatContainer so user can change the model
- [ ] On model change, PATCH /api/v1/settings with new `preferred_model`
- [ ] Pass `model_id` with every chat request in `use-chat.ts`
