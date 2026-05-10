---
# pawrrtal-sond
title: Chat composer UI polish
status: completed
type: task
priority: normal
created_at: 2026-05-03T22:03:23Z
updated_at: 2026-05-03T22:06:11Z
---

Shift+Tab plan tag toggle, suggestion row hover/X, model menu styling, tooltip fixes, connect apps strip contrast.



## Summary of Changes
- Shift+Tab on the chat composer toggles Plan tag visibility; Plan tooltip explains the shortcut.
- Auto-review and model selector tooltips are controlled so they do not stay open after closing a menu.
- Model trigger uses a stronger hover background; model dropdowns use composer-matched surface (globals + class).
- Empty-state suggestions: text-only hover color, per-row dismiss X, no row background hover.
- Connect apps strip uses bg-foreground-10 for subtle differentiation from the composer body.
