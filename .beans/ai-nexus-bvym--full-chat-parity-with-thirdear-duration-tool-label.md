---
# ai-nexus-bvym
title: 'Full chat parity with thirdear: duration, tool labels, source chips, actions, recovery'
status: completed
type: task
priority: high
created_at: 2026-05-04T10:22:56Z
updated_at: 2026-05-04T10:37:27Z
---

Layer the missing thirdear /c-route polish onto AssistantMessage. See parent bean ai-nexus-613t for the gap analysis.

## Todos
- [x] Track thinking start/end timestamps and feed duration to the reasoning panel
- [x] Per-tool labels with icons + active/past-tense variants in thinking-constants.ts
- [x] Pre-tool thinking text accumulates and remains visible alongside tool steps
- [x] Sectioned thinking parser in thinking-parser.ts (ATX and bold headings)
- [x] Interleaved chronology via ChatTimelineEntry[] populated by the reducer
- [x] Source chips row (web favicons, calendar events, memory results) in ToolResultChipsRow
- [x] Reply actions row + useCopyToClipboard hook with auto-clearing Copied state
- [x] Failed-reply banner with Retry button drives handleRegenerate
- [x] useChatBackgroundRecovery hook resumes interrupted turns from SessionStorage
- [x] tsc/biome clean, 60/60 tests passing, production build clean

## Summary of Changes

### New modules
- `frontend/features/chat/thinking-constants.ts` — present/past-tense tool labels + icon registry + memory-tool predicate.
- `frontend/features/chat/thinking-parser.ts` — section parser for ## / ** headings + duration formatter.
- `frontend/features/chat/tool-result-parsers.ts` — typed extractors for web_search citations, calendar_search events, memory_search/summary_search/search_chat_history results.
- `frontend/features/chat/chat-reducer.ts` — pure reducer that folds SSE events into the assistant turn (extracted out of ChatContainer for testability + length budget).
- `frontend/features/chat/hooks/use-copy-to-clipboard.ts` — clipboard hook with execCommand fallback + auto-clearing feedback id.
- `frontend/features/chat/hooks/use-chat-turns.ts` — owns chatHistory/isLoading/regenerate/copy lifecycle (lifted from ChatContainer so the container stays under the function-length budget).
- `frontend/features/chat/hooks/use-chat-background-recovery.ts` — SessionStorage breadcrumb that resumes interrupted assistant turns on remount.
- `frontend/features/chat/components/ChainOfThought.tsx` — chronologically-ordered reasoning + tool steps, sectioned thinking, per-tool icons + status bullets, connector rail.
- `frontend/features/chat/components/ToolResultChipsRow.tsx` — favicon/calendar/memory chips with overflow `+N more`.
- `frontend/features/chat/components/ReplyActionsRow.tsx` — copy/regenerate/share toolbar with Copied feedback.
- `frontend/features/chat/chat-reducer.test.ts`, `tool-result-parsers.test.ts`, `thinking-parser.test.ts` — 20 new unit tests covering all parsers + the reducer (timeline coalescing, tool transitions, error path).

### Existing modules updated
- `frontend/lib/types.ts` — AgnoMessage gained `timeline`, `thinking_started_at`, `thinking_duration_seconds`, `assistant_status`.
- `frontend/features/chat/types.ts` — ChatToolCall now carries optional chip arrays; new ChatTimelineEntry + AssistantMessageStatus.
- `frontend/features/chat/components/AssistantMessage.tsx` — fully rebuilt: Loader → ReasoningPanel (with brain icon, duration label, ChainOfThought) → FailedReplyBanner with Retry → markdown body → ReplyActionsRow.
- `frontend/features/chat/ChatContainer.tsx` — slimmed to a router/title shell that delegates streaming state to useChatTurns and reload-recovery to useChatBackgroundRecovery.
- `frontend/features/chat/ChatView.tsx` — forwards regenerate/copy/copiedId/regeneratingIndex per assistant row.

### Verification
- bun x tsc --noEmit — clean
- bun run fix (biome check --write) — clean
- bun run test — 60/60 passing (was 40/40 — added 20 unit tests)
- bun run build — clean

### What still needs server-side support
- Thinking duration, tool calls, source chips are live-only; they are not persisted by `_serialize_chat_history` in `backend/app/api/conversations.py`. To make them survive a refresh without the recovery hook, that serializer would need to encode the rich shape. Not done in this bean.
