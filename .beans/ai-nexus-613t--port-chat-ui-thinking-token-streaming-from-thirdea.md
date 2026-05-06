---
# ai-nexus-613t
title: Port chat UI + thinking-token streaming from thirdear-webapp /c route to AI Nexus
status: completed
type: feature
priority: high
created_at: 2026-05-04T10:09:17Z
updated_at: 2026-05-04T10:21:26Z
---

Mirror the chat experience and streaming architecture (including thinking tokens) from .private/thirdear-webapp /c/[uuid] route into AI Nexus frontend.

## Plan

Backend already emits typed SSE events (delta/thinking/tool_use/tool_result/error in backend/app/api/chat.py:45-50). Frontend currently drops everything except delta in features/chat/hooks/use-chat.ts. AI Nexus also already has `<Reasoning>` and `<Tool>` ai-elements components ready to use.

Mirror the thirdear chat experience by surfacing thinking + tool events in the existing AI Nexus chat instead of porting the full thirdear stack (it depends on closed-source @twinmind/api). Reuse AI Nexus's existing primitives.

## Todos
- [x] Add ChatStreamEvent discriminated union + extend AgnoMessage with thinking/tool_calls
- [x] Convert useChat to yield typed events instead of bare strings
- [x] Update ChatContainer to accumulate thinking text and tool calls into message state
- [x] Build ChatMessage component that renders <Reasoning> above the markdown body and <Tool> rows for tool calls
- [x] Wire ChatMessage through ChatView, replacing inline rendering
- [x] Update existing use-chat tests for new event shape
- [x] Run typecheck/biome/tests/build (all green)
- [ ] Manual smoke test (dev server, send a chat, verify thinking + tools render) — for the user to run

## Summary of Changes

Commit: 19d382f feat(chat): surface thinking + tool events in the /c route

### Files
- frontend/features/chat/types.ts (new) — ChatStreamEvent discriminated union covering all five backend SSE event types, plus ChatToolCall.
- frontend/lib/types.ts — AgnoMessage extended with optional thinking and tool_calls. Server-fetched history (role+content only) hydrates unchanged.
- frontend/features/chat/hooks/use-chat.ts — yields typed events, runtime-narrows the SSE payload, throws on backend error events, releases the reader lock in finally.
- frontend/features/chat/hooks/use-chat.test.ts — covers thinking/tool_use/tool_result/unknown-event paths.
- frontend/features/chat/ChatContainer.tsx — pure applyChatEvent reducer drives the in-flight assistant message via updateLastAssistantMessage.
- frontend/features/chat/components/AssistantMessage.tsx (new) — initial Loader, then Reasoning, Tool rows, then markdown body. Sections hide when empty.
- frontend/features/chat/ChatView.tsx — routes assistant rows through AssistantMessage.

### Verification
- bun x tsc --noEmit — clean
- bun run fix — clean
- bun run test — 40/40 passing
- bun run build — clean
- lefthook pre-commit — all hooks passed

### Notes for follow-up
- backend/app/api/conversations.py:_serialize_chat_history only persists role+content, so thinking/tool_calls are live-only for now.
- Did not file-by-file port thirdear: it depends on closed-source @twinmind/api, persistent-shell + tripartite contexts, and Bootstrap/SignIn modal flow. Reusing AI Nexus's existing Reasoning/Tool ai-elements gives the same UX with far fewer dependencies.
