---
# ai-nexus-482c
title: Fix pre-push hook failures on stack/5-presentation-components
status: completed
type: bug
priority: normal
created_at: 2026-04-27T00:44:44Z
updated_at: 2026-04-27T00:52:52Z
---

Pre-push hook failures blocking push: Biome lint/format errors (93 errors, 17 warnings across 139 files), useless fragment in app/(app)/layout.tsx, console statements in dev.ts, excessive complexity in EventEmitter.ts, plus 2 TypeScript errors in features/nav-chats (NavChats.tsx missing props, use-nav-chats-orchestration.ts importing non-existent useOptionalSidebarFocusContext).

## Tasks
- [x] Investigate TypeScript error: NavChats.tsx missing props on NavChatsViewProps
- [x] Investigate TypeScript error: use-nav-chats-orchestration.ts useOptionalSidebarFocusContext
- [x] Auto-fix Biome formatting/lint where safe
- [x] Add Biome override for vendored react-resizable-panels (skips linter on EventEmitter and other vendor files)
- [x] Re-run pre-push hooks to verify clean
- [x] Push to origin

## Summary of Changes

Pre-push hook was failing on `stack/5-presentation-components`. Two distinct
problems were chained together:

1. **Incomplete orchestration commit (4db3e7e).** The commit added
   `use-nav-chats-orchestration.ts` and referenced
   `useOptionalSidebarFocusContext`, but never:
   - Added the non-throwing context hook to `sidebar-focus.tsx`
   - Wired the orchestration hook into `NavChats` (the container)

   Result: 2 TS errors — missing export `useOptionalSidebarFocusContext`,
   and `NavChatsView` missing 10 required props on the call site.

   Fix: added `useOptionalSidebarFocusContext` (returns `useContext` value
   without throwing), imported `useNavChatsOrchestration` in `NavChats`,
   removed the duplicate local `isSearchActive` (now sourced from
   orchestration so the rule lives in one place), and forwarded all 10
   orchestration return fields to `NavChatsView`.

2. **Vendored `react-resizable-panels` was being linted.** The package
   triggered 6 lint errors and a noExcessiveCognitiveComplexity warning.
   Fix: added a Biome `overrides` entry mirroring the
   `frontend/components/ui/**` pattern (linter/formatter/assist disabled)
   for `frontend/packages/react-resizable-panels/**`.

Also folded in formatter-only Biome auto-fixes for the layout/auth/api
files that were part of this branch's commit set.

Verified with the pre-push hook: `✔️ check (0.59s)`, `✔️ typecheck (3.33s)`.
Push landed: `203d52a..6a8ad6d  stack/5-presentation-components -> stack/5-presentation-components`.

## Follow-ups (deferred)

Biome's `--write` pass also touched ~54 files outside this branch's commit
set (e.g. `.agents/skills/ai-elements/scripts/**`, more `frontend/components/ai-elements/**`,
`commit.ts`, `repomix.config.json`). These are formatter-only changes to
files that already exist on `main` with their old formatting. They are
left as uncommitted working-tree changes and are out of scope for this
push. A separate "repo-wide Biome cleanup" PR could land them.
