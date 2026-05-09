---
# pawrrtal-62j5
title: Playwright-electron E2E suite (smoke test the desktop shell)
status: todo
type: task
priority: low
created_at: 2026-05-05T06:09:42Z
updated_at: 2026-05-05T06:09:42Z
---

The web Playwright suite covers login, sidebar, settings, onboarding via the FE Next.js dev server. The Electron shell has unit tests for \`frontend/lib/desktop.ts\` only — there's no end-to-end test that actually launches the BrowserWindow.

**Scope.**
- Add \`@playwright/test\` Electron support (or use \`playwright-electron\` directly; same Microsoft-maintained surface).
- New folder \`electron/e2e/\` with at least:
  - \`launch.spec.ts\` — app starts, BrowserWindow loads the dev URL, title reads "Pawrrtal", window has the persisted geometry.
  - \`menu.spec.ts\` — File → New chat triggers the IPC channel + the FE routes to /.
  - \`external-links.spec.ts\` — clicking an external link calls \`shell.openExternal\` (mocked) instead of opening in-window.
  - \`single-instance.spec.ts\` — launching a second instance focuses the existing window.
- New \`just electron-e2e\` recipe.

**Notes.**
- Tests must launch the bundled Electron app, not the Next.js dev server. Set \`ELECTRON_DEV=1\` so it attaches to a parallel-spawned dev server (or skip dev mode and run against the standalone build).
- These will run slower than the FE Playwright suite — keep them out of the default \`just check\` gate.

## Todo
- [ ] Install playwright-electron + add to electron/package.json devDeps
- [ ] launch.spec.ts (BrowserWindow geometry + title)
- [ ] menu.spec.ts (Cmd+N → IPC → route)
- [ ] external-links.spec.ts (shell.openExternal called)
- [ ] single-instance.spec.ts
- [ ] just electron-e2e recipe
