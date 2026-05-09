---
# pawrrtal-ruy8
title: Wire native menu File→New Chat to FE route handler
status: todo
type: task
priority: low
created_at: 2026-05-05T06:10:16Z
updated_at: 2026-05-05T06:10:16Z
---

The Electron menu's File → New Chat (Cmd/Ctrl+N) sends the IPC channel \`desktop:menu-new-chat\` from the main process. The preload bridge exposes \`onMenuNewChat(handler)\` and \`frontend/lib/desktop.ts\` wraps it. **Nothing in the FE subscribes to it yet.**

**Scope.**
- In \`frontend/components/app-layout.tsx\` (or a small wrapper hook), call \`onMenuNewChat\` once on mount; on fire, call \`router.replace('/')\` (the home page is where new chats start).
- Add a unit test: when window.pawrrtal injects an onMenuNewChat that fires the handler, the router replace is called with '/'.

## Todo
- [ ] Add useEffect in app-layout (or a useMenuNewChat hook in features/electron/)
- [ ] Route to / on fire
- [ ] Vitest test with mocked pawrrtal + mocked router
- [ ] Smoke test in Electron: Cmd+N navigates home
