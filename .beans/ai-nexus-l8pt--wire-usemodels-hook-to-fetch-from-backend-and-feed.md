---
# pawrrtal-l8pt
title: Wire useModels hook to fetch from backend and feed model selector
status: todo
type: task
priority: high
created_at: 2026-03-12T00:29:07Z
updated_at: 2026-03-12T00:44:45Z
parent: pawrrtal-3i2d
blocked_by:
    - pawrrtal-x22k
---

## Goal

Uncomment and implement `use-models.ts` to fetch the real model list from `GET /api/v1/models`, then feed it into the new model selector popover.

## Tasks

- [ ] Implement `useModels()` hook in `frontend/features/chat/hooks/use-models.ts` (currently fully commented out)
- [ ] Define a `Model` type (id, display_name, provider) and a `GroupedModels` type (provider -> Model[])
- [ ] Transform the flat API response into grouped-by-provider structure for the selector
- [ ] Replace the hardcoded model list in `ChatView.tsx` with data from `useModels()`
- [ ] Wire the new model selector popover component into `ChatView.tsx` in place of the current ai-elements one

## Blocked by

- `pawrrtal-x22k` (backend models endpoint must return real data first)

## Key Files

- `frontend/features/chat/hooks/use-models.ts` (commented stub)
- `frontend/features/chat/ChatView.tsx` (hardcoded model list + selector)
- `frontend/lib/api.ts` (endpoint already defined: `/api/v1/models`)
