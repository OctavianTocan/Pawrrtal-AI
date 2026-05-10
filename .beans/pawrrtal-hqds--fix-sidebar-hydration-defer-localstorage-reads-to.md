---
# pawrrtal-hqds
title: 'Fix sidebar hydration: defer localStorage reads to useLayoutEffect'
status: completed
type: bug
priority: normal
created_at: 2026-05-02T20:04:59Z
updated_at: 2026-05-02T20:05:17Z
---

SidebarProvider useState initializer read localStorage on client only; SSR used defaults. Hydrate expanded/collapsed and desktop width after mount.

\n\n## Summary of Changes\n\n- `SidebarProvider`: initialize `desktopWidth` with `SIDEBAR_DEFAULT_WIDTH` and `_state` from `defaultOpen` only (no `localStorage` in `useState` lazy initializers).\n- Hydrate width + persisted collapsed/expanded from `localStorage` in `useLayoutEffect` before paint (skip state hydrate when `openProp` is controlled).\n- Matches SSR/first client render so inline sidebar fade styles (`app-layout.tsx`) no longer hydrate-mismatch.
