---
# ai-nexus-613t
title: Port chat UI + thinking-token streaming from thirdear-webapp /c route to AI Nexus
status: in-progress
type: feature
priority: high
created_at: 2026-05-04T10:09:17Z
updated_at: 2026-05-04T10:20:02Z
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
- [ ] Manual smoke test (dev server, send a chat, verify thinking + tools render)
