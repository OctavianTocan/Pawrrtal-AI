---
# ai-nexus-482c
title: Fix pre-push hook failures on stack/5-presentation-components
status: in-progress
type: bug
priority: normal
created_at: 2026-04-27T00:44:44Z
updated_at: 2026-04-27T00:51:32Z
---

Pre-push hook failures blocking push: Biome lint/format errors (93 errors, 17 warnings across 139 files), useless fragment in app/(app)/layout.tsx, console statements in dev.ts, excessive complexity in EventEmitter.ts, plus 2 TypeScript errors in features/nav-chats (NavChats.tsx missing props, use-nav-chats-orchestration.ts importing non-existent useOptionalSidebarFocusContext).

## Tasks
- [x] Investigate TypeScript error: NavChats.tsx missing props on NavChatsViewProps
- [x] Investigate TypeScript error: use-nav-chats-orchestration.ts useOptionalSidebarFocusContext
- [x] Auto-fix Biome formatting/lint where safe
- [x] Add Biome override for vendored react-resizable-panels (skips linter on EventEmitter and other vendor files)
- [ ] Re-run pre-push hooks to verify clean
- [ ] Push to origin
