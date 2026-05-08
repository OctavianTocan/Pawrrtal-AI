---
# pawrrtal-uyh5
title: Diagnose & fix Electron desktop shell not opening
status: completed
type: bug
priority: high
created_at: 2026-05-06T11:17:53Z
updated_at: 2026-05-06T11:23:58Z
---

User reported launching the Electron app does nothing — window never appears. Audit electron/ structure against best practices and reproduce the failure.



## Investigation findings (resolved)

User confirmed app now opens. Visible issue: macOS traffic lights overlap the AppHeader's leftmost controls (SidebarTrigger / back-forward / workspace pill).

Root cause: `titleBarStyle: 'hiddenInset'` (electron/src/main.ts:70) keeps the system buttons inside the BrowserWindow content area. The frontend's `AppHeader` (frontend/components/app-layout.tsx:214-244) uses `px-3` so its content starts at x=12px — directly under the traffic lights.

## Plan to fix top-bar overlap

- [x] Expose `platform: process.platform` synchronously from electron preload
- [x] Mirror `platform` on the typed `DesktopBridge` in frontend/lib/desktop.ts
- [x] Add `useIsMacDesktop` detection in app-layout
- [x] Apply 80px left padding in AppHeader on macOS desktop, keep `pl-3` everywhere else
- [x] Rebuild electron shell so new preload ships
- [x] Verify: traffic lights no longer overlap controls (pending user reload)

## Summary of Changes

- **electron/src/preload.ts** — exposed `platform: process.platform` synchronously on the `pawrrtal` bridge so the renderer can make first-paint layout decisions without an async IPC round-trip.
- **frontend/lib/desktop.ts** — added `platform: NodeJS.Platform` to the typed `DesktopBridge` and exported `getDesktopPlatformSync()` (returns `null` on web/SSR).
- **frontend/components/app-layout.tsx** — added `useIsMacDesktop()` hook plus `MAC_TRAFFIC_LIGHT_RESERVE_PX = 80` constant. `AppHeader` now applies a 80px left padding via inline style only on macOS desktop, keeping `pl-3` for web/Windows/Linux. Hook starts `false` so SSR/initial-client renders match (no hydration mismatch), then flips on mount.

Gates: `tsc` clean on frontend, `tsc` clean on electron build, biome check clean (the one pre-existing warning in AppearanceSection.tsx is unrelated).
