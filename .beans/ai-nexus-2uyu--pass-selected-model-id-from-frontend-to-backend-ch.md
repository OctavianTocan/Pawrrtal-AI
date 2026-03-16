---
# ai-nexus-2uyu
title: Pass selected model_id from frontend to backend chat endpoint
status: todo
type: task
priority: high
created_at: 2026-03-12T00:29:18Z
updated_at: 2026-03-12T00:44:45Z
parent: ai-nexus-3i2d
---

## Problem

The backend `ChatRequest` schema already accepts `model_id` (defaults to "gemini-3-flash-preview"), and `create_agent()` already uses it dynamically. BUT the frontend `streamMessage()` in `use-chat.ts` never sends `model_id` in the POST body.

The model selector in `ChatView.tsx` maintains local state (`selectedModel`) but it's never passed down to the stream function.

## Tasks

- [ ] Update `streamMessage()` in `use-chat.ts` to accept and send `model_id` in the request body
- [ ] Thread `selectedModel` from `ChatView.tsx` through `ChatContainer.tsx` to the `streamMessage()` call
- [ ] Verify the backend receives and uses the model_id correctly

## Key Files

- `frontend/features/chat/hooks/use-chat.ts` (streamMessage function)
- `frontend/features/chat/ChatView.tsx` (has selectedModel state)
- `frontend/features/chat/ChatContainer.tsx` (calls streamMessage)
- `backend/app/schemas.py` (ChatRequest already has model_id)
- `backend/app/api/chat.py` (already passes model_id to create_agent)
