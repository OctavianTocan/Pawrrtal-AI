---
# ai-nexus-up1s
title: Simplify Electron title-bar bridge after overlay inset removal
status: completed
type: task
priority: normal
created_at: 2026-05-07T21:27:28Z
updated_at: 2026-05-07T21:28:19Z
---

Remove unused preload inset API and MacDesktopChrome hook; keep window-chrome.ts for main process only.



## Summary of Changes

- Removed `macTitleBarStyle` / `trafficLightLeftInsetPx` from preload and `DesktopBridge`; deleted `getTrafficLightLeftInsetPxSync` and `useMacDesktopChrome`.
- Trimmed `window-chrome.ts` to `MACOS_TITLE_BAR_STYLE` only (main process).
- Restored `useIsMacDesktop` + fixed `pl-3` on `AppHeader` (no inline padding).
- Documented main-only chrome config and manual FE padding if overlay styles return.
