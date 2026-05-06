---
# ai-nexus-hema
title: 'Diagnostic logging: detect duplicate /api/v1/chat calls'
status: completed
type: task
priority: normal
created_at: 2026-05-04T08:49:55Z
updated_at: 2026-05-04T08:52:37Z
---

Pin backend log file path, add HTTP request middleware with request IDs, and add explicit entry/exit logging in the chat endpoint so we can verify whether /api/v1/chat/ is hit more than once per user message.

## Todo
- [x] Pin log file location to backend/app.log (currently relative — splits across CWDs)
- [x] Switch FileHandler to RotatingFileHandler (10MB × 5 backups)
- [x] Quiet noisy third-party DEBUG loggers (hpack, httpcore, httpx debug)
- [x] Add HTTP middleware: log every request with request_id, method, path, client IP, status, duration
- [x] Add chat endpoint entry/exit log lines (request_id, conversation_id, model_id, user_id)
- [x] Document how to inspect logs to detect duplicate calls

## Summary of Changes

**Files modified**
- `backend/app/logger_setup.py` — pinned log path to `backend/app.log` via `Path(__file__).resolve().parent.parent`, switched to `RotatingFileHandler` (10MB × 5 backups), added millisecond timestamps + thread name, capped noisy `hpack`/`httpcore`/`httpx`/`watchfiles`/`asyncio` loggers at INFO/WARNING.
- `backend/app/core/request_logging.py` *(new)* — `RequestLoggingMiddleware` emits one `REQ_IN` line on entry and one `REQ_OUT` line on exit per HTTP request, each tagged with an 8-char `rid`. Also exposes `get_request_id()` reading from a contextvar so route handlers can include `rid` in their own log lines.
- `backend/main.py` — installed `RequestLoggingMiddleware` before any router is registered.
- `backend/app/api/chat.py` — added `CHAT_IN` / `CHAT_OUT` / `CHAT_ERR` / `CHAT_404` log lines tagged with `rid`, `conversation_id`, `model_id`, `user_id`, `question_len`, `events`, and `duration_ms`. Question content is **not** logged — only its length.

**How to detect a duplicate chat call**

After sending a single user message, run:
`grep 'POST /api/v1/chat' backend/app.log | tail -20`

For a single user send you should see exactly one `REQ_IN` and one `REQ_OUT` for `POST /api/v1/chat/`. A duplicate looks like two `REQ_IN` lines back-to-back with different `rid` values within a few milliseconds. Cross-reference with `CHAT_IN rid=<id>` to confirm the route handler also fired twice.

**Verification**
- All 84 backend tests pass.
- TestClient smoke run produced two clean REQ_IN/REQ_OUT pairs with unique `rid` values, proving middleware is wired correctly and logs flush to `backend/app.log`.
