---
# pawrrtal-hc99
title: Fix Gemini provider-native replay state for tool calls
status: todo
type: bug
priority: high
created_at: 2026-05-16T22:50:22Z
updated_at: 2026-05-16T22:50:22Z
---

Gemini 3 tool use currently fails after the first tool call because the provider rebuilds function_call parts from the provider-neutral ToolCallContent shape and drops Gemini-native metadata such as Part.thought_signature. Preserve provider-native replay state inside the active agent loop while keeping StreamEvent, Telegram, chat persistence, and provider-neutral tool execution unchanged.

Related completed red-test bean: pawrrtal-55sw.

## Acceptance Criteria

- [ ] Add optional opaque provider_state to LLMDoneEvent and AssistantMessage without exposing provider-specific fields to StreamEvent.
- [ ] Carry provider_state through agent_loop into the assistant message seen by the next LLM turn.
- [ ] In Gemini streaming, capture the native Gemini model content or original function_call parts that include thought_signature.
- [ ] In Gemini history conversion, replay provider_state["gemini"]["model_content"] when present instead of reconstructing function_call parts from name/args.
- [ ] Keep tool execution, permission checks, safety limits, Telegram tool events, and chat persistence provider-agnostic.
- [ ] Do not persist provider_state into chat_messages. It may contain SDK objects and bytes and should be active-loop-only.
- [ ] Make backend/tests/test_provider_native_replay_state.py pass.
- [ ] Re-run the existing Gemini manual function-calling tests to ensure current tool-result behavior stays intact.

## References

- Gemini thought signatures docs: https://ai.google.dev/gemini-api/docs/thought-signatures
- TODO anchors currently exist in backend/app/core/agent_loop/types.py, backend/app/core/agent_loop/loop.py, and backend/app/core/providers/gemini_provider.py.
