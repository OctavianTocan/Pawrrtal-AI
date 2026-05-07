---
# ai-nexus-uuza
title: 'Fix chat 500: missing limit param in get_messages_for_conversation + bad gemini_utils model'
status: completed
type: bug
created_at: 2026-05-06T21:50:54Z
updated_at: 2026-05-06T21:50:54Z
---

Root cause of all POST /api/v1/chat/ 500 errors: commit 55b1aff added limit=_HISTORY_WINDOW to the call in chat.py but never updated get_messages_for_conversation() to accept a limit param. This TypeError was silently swallowed by uvicorn.error (propagate=False) so no traceback appeared in app.log. Also fixed gemini_utils._DEFAULT_MODEL from gemini-2.5-flash-preview-05-20 (404 on this API key) to gemini-2.0-flash.

## Summary of Changes
- backend/app/crud/chat_message.py: added limit: int | None = None to get_messages_for_conversation(); when limit is set, fetches tail in DESC order then reverses in Python
- backend/app/core/gemini_utils.py: changed _DEFAULT_MODEL from gemini-2.5-flash-preview-05-20 to gemini-2.0-flash
- backend/app/api/conversations.py: try/except around generate_text_once so title failures return empty string instead of 500 (prior session fix)
