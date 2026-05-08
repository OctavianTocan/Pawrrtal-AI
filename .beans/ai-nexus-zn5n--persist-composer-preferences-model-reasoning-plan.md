---
# pawrrtal-zn5n
title: Persist composer preferences (model, reasoning, plan mode, safety mode)
status: completed
type: feature
priority: normal
created_at: 2026-05-04T09:30:53Z
updated_at: 2026-05-04T09:34:15Z
---

Add localStorage persistence for chat composer preferences:
- Selected model ID (ChatModelId)
- Reasoning level (ChatReasoningLevel)
- Plan mode toggle (default OFF — chat starts without plan mode)
- Safety mode (currently hardcoded "Auto-review" in AutoReviewSelector dropdown — lift state, persist)

## Approach
1. Add a reusable usePersistedState hook (hooks/use-persisted-state.ts) — SSR-safe, try/catch for private browsing/quota, optional validator.
2. ChatContainer: swap useState → usePersistedState for selectedModelId and selectedReasoning.
3. ChatComposer: persist isPlanTagVisible, default to false.
4. AutoReviewSelector: introduce SafetyMode type + persisted state, render active selection in trigger + checkmark.

Follows existing pattern from features/nav-chats/NavChats.tsx (collapsed groups persistence).

## Todos
- [x] Add usePersistedState hook
- [x] Persist selectedModelId in ChatContainer
- [x] Persist selectedReasoning in ChatContainer
- [x] Persist plan mode in ChatComposer (default false)
- [x] Lift + persist safety mode in AutoReviewSelector
- [x] Run bun run check + tsc

## Summary of Changes

- New reusable hook frontend/hooks/use-persisted-state.ts: SSR-safe useState backed by localStorage with optional runtime validator and try/catch around storage I/O (private browsing / quota safe).
- frontend/features/chat/components/ModelSelectorPopover.tsx: ChatModelId and ChatReasoningLevel now derived from CHAT_MODEL_IDS / CHAT_REASONING_LEVELS as const arrays so callers can validate persisted strings at runtime.
- frontend/features/chat/ChatContainer.tsx: selectedModelId and selectedReasoning swapped to usePersistedState with isChatModelId / isChatReasoningLevel guards. Storage keys: chat-composer:selected-model-id, chat-composer:selected-reasoning-level.
- frontend/features/chat/components/ChatComposer.tsx: isPlanTagVisible swapped to usePersistedState via small usePlanModeVisible hook. Default flipped from true to false so a fresh chat does not start in Plan mode. Storage key: chat-composer:plan-mode-visible.
- frontend/features/chat/components/ChatComposerControls.tsx: AutoReviewSelector lifted from stateless hardcoded markup into stateful selector. New SAFETY_MODES as const tuple, SafetyMode union, SAFETY_MODE_META map, isSafetyMode guard, and a SafetyModeMenuItem subcomponent. Persists via usePersistedState; trigger label and check mark now reflect the active selection. Storage key: chat-composer:safety-mode. Default: auto-review (matches prior visual state).

Typecheck (tsc --noEmit) passes. Biome check passes. All 38 vitest tests pass.
