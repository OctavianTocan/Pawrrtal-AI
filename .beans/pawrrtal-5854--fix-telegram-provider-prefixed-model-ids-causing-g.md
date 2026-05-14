---
# pawrrtal-5854
title: Fix telegram provider-prefixed model IDs causing Gemini 404
status: completed
type: bug
priority: high
created_at: 2026-05-14T05:15:03Z
updated_at: 2026-05-14T05:18:33Z
---

Telegram sends model IDs as 'google/gemini-3-flash-preview' (with provider prefix) but resolve_llm() passes them through unchanged. Gemini SDK gets 'google/gemini-3-flash-preview' and returns 404 Not Found. Web app sends bare 'gemini-3-flash-preview' which works. Fix: strip provider prefix in resolve_llm so both forms route correctly.

## Summary of Changes

**Root cause:** `backend/app/core/providers/factory.py` did not strip the `google/` or `anthropic/` provider segment that the Telegram channel prepends to model IDs (`google/gemini-3-flash-preview`). The Gemini SDK rejects the prefixed form with HTTP 404. The web app worked because `frontend/features/chat/constants.ts` already uses bare model IDs.

**Fix:** Added `_strip_provider_segment()` in `resolve_llm()` so both `google/gemini-3-flash-preview` and the bare `gemini-3-flash-preview` route the same way and land at the SDK with a clean model ID. Provider routing (gemini vs claude) happens on the stripped ID.

**Tests added** (`backend/tests/test_providers_and_schemas.py`):
- `test_resolve_llm_strips_google_provider_segment` — `google/gemini-...` → GeminiLLM with bare model_id.
- `test_resolve_llm_strips_anthropic_provider_segment` — `anthropic/claude-...` → ClaudeLLM with bare model_id.
- `test_resolve_llm_preserves_bare_model_id` — bare IDs unchanged.

Also lifted 8 PLC0415 `import-inside-function` lint errors in the same test file to module-level imports.

All 95 tests across factory / chat-api / claude-provider / telegram-channel passing; ruff clean on touched files.
