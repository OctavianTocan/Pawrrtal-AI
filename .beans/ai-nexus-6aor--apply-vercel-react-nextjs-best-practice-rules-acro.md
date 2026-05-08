---
# pawrrtal-6aor
title: Apply Vercel React + Next.js best-practice rules across the chat stack
status: completed
type: task
priority: high
created_at: 2026-05-04T11:00:21Z
updated_at: 2026-05-04T11:06:13Z
---

Audit recent feature work (chat streaming, AssistantMessage, ChainOfThought, ChatContainer, usePersistedState, server-side chat persistence) against Vercel's 62 React perf rules and Next.js best practices. Focus on highest-impact: waterfalls, bundle size, server-side, re-renders.

## Summary of Changes

### Applied
- **bundle-barrel-imports** (CRITICAL): added `experimental.optimizePackageImports` to `next.config.ts` for `lucide-react`, `@tabler/icons-react`, `@hugeicons/react`, `@radix-ui/react-icons`, `date-fns`. 35 files were importing from the lucide-react barrel — Next.js will now rewrite each into a direct ESM import at build time. Vercel quotes 15-70% faster dev boot, ~28% faster builds, ~40% faster cold starts on icon-heavy code.
- **rerender-functional-setstate** (MEDIUM): rewrote ChatContainer's `handleUpdateMessage` / `handleReplaceMessageContent` (previously read `message` directly inside setMessage) to use functional `setMessage(curr => ...)`. Wrapped in `useCallback` with empty deps so identities are stable across renders.
- **rerender-no-inline-components** (HIGH): wrapped `handleSendMessage` and `handleRegenerate` in `useCallback`. `handleRegenerate` reads `chatHistory` through a ref so the callback identity doesn't churn on every streamed event (chatHistory updates O(events) times per turn).
- **async-parallel** (CRITICAL): `ConversationPage` now resolves `params` and `cookies()` in `Promise.all` rather than two sequential `await`s.
- Extracted composer state into `useComposerMessage` hook so ChatContainer body fits the function-length budget while gaining a unit-testable seam.

### Skipped (deemed not applicable / pre-existing best practice)
- **rerender-no-inline-components**: audited ChainOfThought, AssistantMessage, ChatComposer — all sub-components are top-level functions, no inline definitions.
- **client-localstorage-schema** versioning: `CHAT_STORAGE_KEYS` already namespaces with `chat:*`. No version suffix yet, but with `usePersistedState` carrying a `validate` guard that drops invalid persisted values, schema drift is handled. Versioning could be added in a future bean if a breaking shape change ships.
- **bundle-dynamic-imports**: Reasoning, Tool, ChainOfThought, AssistantMessage are all needed on first paint of a chat page; none are heavy enough to dynamic-import.
- **async-suspense-boundaries**: would require restructuring ConversationPage so the chat shell paints before the message fetch lands. Bigger change — file as a follow-up if perceived TTFB matters.

### Verification
- `bun x tsc --noEmit` clean
- `bun run fix` (biome) clean
- `bun run test` 60/60
- `bun run build` clean
