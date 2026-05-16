---
# pawrrtal-df2v
title: Fix Gemini provider to use request system prompt
status: todo
type: bug
priority: high
created_at: 2026-05-16T22:11:56Z
updated_at: 2026-05-16T22:11:56Z
---

GeminiLLM.stream() stores the per-turn system_prompt in AgentContext, but make_gemini_stream_fn() currently builds GenerateContentConfig with _FALLBACK_SYSTEM_PROMPT because the StreamFn contract only receives messages and tools. Thread the request system prompt into the Gemini SDK call so Gemini agents receive the workspace/user prompt instead of the fallback. Add regression coverage that a supplied system_prompt reaches GenerateContentConfig.system_instruction.
