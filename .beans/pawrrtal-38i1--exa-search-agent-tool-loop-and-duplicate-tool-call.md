---
# pawrrtal-38i1
title: 'Exa search: agent tool loop and duplicate tool-call React keys'
status: todo
type: bug
priority: high
tags:
    - exa
    - chat
    - tools
created_at: 2026-05-13T21:05:41Z
updated_at: 2026-05-13T21:05:41Z
---

## Problem

Exa search integration is unreliable in production-like dev: the agent may call `exa_search` repeatedly in a loop, and the chat UI emits React warnings about duplicate list keys.

## Symptoms

1. **Runaway tool calls**: User asks for Exa search; the agent keeps invoking the tool repeatedly instead of settling.
2. **Console**: `Encountered two children with the same key, tool-call-exa_search-0` — duplicate keys during list reconciliation.

## Likely frontend touchpoint

- `frontend/features/chat/components/ChainOfThought.tsx` (~line 162): `items.map` renders `<ToolStep>` with keys derived from tool name + index; multiple steps share `exa_search` + index `0`, so keys collide.
- Caller stack: `ChainOfThought` ← `ReasoningPanel` ← `AssistantMessage` ← `ActiveConversationState` in `ChatView`.

## Acceptance criteria ideas

- [ ] Keys for tool/reasoning steps are stable and unique across the message (include toolCallId / provider id / turn ordinal, not only `toolName-index`).
- [ ] Investigate backend/agent: why repeated `exa_search` invocations occur (safety limits, error handling, or UI feedback loop) and cap or fix.
- [ ] Dev console clean on a thread with multiple Exa tool steps (no duplicate-key warnings).

## References

- Terminal/browser log: duplicate key `tool-call-exa_search-0` (pawrrtal dev).
