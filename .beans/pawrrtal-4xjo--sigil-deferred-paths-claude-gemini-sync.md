---
# pawrrtal-4xjo
title: Sigil deferred paths (Claude + Gemini SYNC)
status: completed
type: task
priority: normal
created_at: 2026-05-10T13:53:23Z
updated_at: 2026-05-10T13:57:33Z
---

Instrument ClaudeLLM.stream with STREAM; gemini non-stream SYNC + commit CLI.

## Summary of Changes

- ClaudeLLM.stream: Sigil STREAM generations + with_conversation_id; query loop extracted to claude_query_stream + claude_sdk_input
- gemini_utils: shared generate_content_sync_recorded (SYNC) for titles + commit CLI
- Tests: test_sigil_deferred.py; mock query via claude_query_stream in test_claude_provider
