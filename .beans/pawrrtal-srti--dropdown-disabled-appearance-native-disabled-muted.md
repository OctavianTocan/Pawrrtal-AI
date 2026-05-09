---
# pawrrtal-srti
title: 'Dropdown disabled appearance: native disabled + muted tray + @source'
status: completed
type: task
priority: normal
created_at: 2026-05-07T20:56:34Z
updated_at: 2026-05-07T20:57:15Z
---

Make disabled menu rows visibly distinct from enabled.



## Summary of Changes

- `frontend/app/globals.css`: Added Tailwind v4 `@source` for `lib/react-dropdown/src` so utilities from the linked package are always emitted.
- `frontend/lib/react-dropdown/src/DropdownPanelItems.tsx`: Switched disabled visuals to native `disabled:*` variants and a persistent `disabled:bg-muted/50` tray plus muted label/icon colors (replacing `data-disabled:*` opacity-only styling).
