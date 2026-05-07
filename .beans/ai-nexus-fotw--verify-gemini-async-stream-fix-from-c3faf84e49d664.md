---
# ai-nexus-fotw
title: Verify Gemini async stream fix from c3faf84/e49d664
status: todo
type: bug
priority: high
created_at: 2026-05-07T16:18:44Z
updated_at: 2026-05-07T16:18:44Z
---

## Context

User reported: ``Gemini error: 'async for' requires an object with __aiter__ method, got coroutine`` when chatting with Gemini models from both web/desktop and Telegram.

Commit ``e49d664`` (chore(types) cleanup) included the fix in ``app/core/providers/gemini_provider.py``: the SDK's async ``generate_content_stream`` returns ``Coroutine[..., AsyncIterator[...]]`` (per its own docstring example), so the call site must ``await`` it before ``async for``-ing.

```python
# Before (broken):
async for chunk in client.aio.models.generate_content_stream(...):
# After:
stream = await client.aio.models.generate_content_stream(...)
async for chunk in stream:
```

## What this bean tracks

The fix is in code but the user reported the error before the commit landed. Need to confirm:

1. After backend restart on the latest commit, the error no longer appears in app.log.
2. A real chat against ``gemini-3-flash-preview`` from the web app streams text deltas correctly.
3. A Telegram message routed via ``handle_plain_message`` → bound LLM also streams correctly.
4. The error path emits a useful message to the user (``logger.error`` already added in the same fix).

## Test plan

- [ ] Restart backend with the latest dev branch.
- [ ] Send a message to a Gemini model from the web; observe streamed response.
- [ ] Send a message to the bot (after binding) with the conversation set to a Gemini model; observe streamed response.
- [ ] If still failing: ``grep "Gemini" backend/app.log`` and look for the actual exception class. Check whether ``client.aio.models.generate_content_stream`` is actually the awaitable version (it could be that for streaming Gemini the implicit-coroutine pattern is correct in some SDK versions).

## Notes

- The mypy fix I applied is grounded in the SDK source: ``async def generate_content_stream(...) -> AsyncIterator[GenerateContentResponse]`` at ``models.py:7625`` returns an async generator that has to be awaited first.
- If runtime says otherwise, the SDK is being clever and the type annotation is wrong; revert to the prior pattern with a ``# type: ignore`` and document it.
