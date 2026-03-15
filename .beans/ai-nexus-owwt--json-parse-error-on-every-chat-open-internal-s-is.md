---
# ai-nexus-owwt
title: JSON parse error on every chat open ("Internal S" is not valid JSON)
status: todo
type: bug
priority: critical
created_at: 2026-03-12T00:19:35Z
updated_at: 2026-03-12T00:19:35Z
---

## Problem

Every time a chat is opened, a runtime SyntaxError fires:

```text
SyntaxError: Unexpected token 'I', "Internal S"... is not valid JSON
```

The stack trace points to React Server Components RSC payload parsing (`react-server-dom-turbopack`).

## Root Cause

Two-part failure:

### 1. Backend: Uncaught exceptions in message history endpoint

`backend/app/api/conversations.py:29-49` - The `GET /{conversation_id}/messages` endpoint only catches `ValueError`, `KeyError`, `AttributeError` from `create_history_reader_agent()`. Any other exception (RuntimeError, DB errors, etc.) propagates uncaught to FastAPI, which returns a default **HTML** 500 error page ("Internal Server Error").

Additionally, `backend/main.py` has **no global exception handler**, so uncaught errors always produce HTML responses instead of JSON.

### 2. Frontend: Server Component doesn't check for 5xx responses

`frontend/app/(app)/c/[conversationId]/page.tsx:28-47` - The fetch call only checks for 401 and 404 status codes. On a 500 response, it blindly calls `response.json()` on the HTML error body, which causes the RSC parser to choke on "Internal S..." as invalid JSON.

## Fix Plan

- [ ] Backend: Expand try/except in `get_conversation_messages` to catch `Exception` (or add global FastAPI exception handler that returns JSON)
- [ ] Backend: Add a global JSON exception handler in `main.py` so uncaught errors never return HTML
- [ ] Frontend: Add error handling in the server component for non-2xx responses before calling `.json()`
- [ ] Investigate: What specific exception `create_history_reader_agent()` is throwing (add logging)

## Files

- `backend/app/api/conversations.py` (lines 29-49)
- `backend/main.py` (no global exception handler)
- `frontend/app/(app)/c/[conversationId]/page.tsx` (lines 28-47)
- `backend/app/core/agents.py` (create_history_reader_agent)
