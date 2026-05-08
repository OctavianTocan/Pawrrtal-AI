---
# pawrrtal-7ybl
title: Execute sidebar Craft parity round 2
status: completed
type: task
priority: normal
created_at: 2026-03-26T05:18:13Z
updated_at: 2026-03-26T05:21:08Z
---

Execute plan at docs/superpowers/plans/2026-03-26-sidebar-craft-parity-round-2.md

## Summary of Changes

All 6 tasks from the plan executed:

1. **globals.css** — Added `popover-styled` CSS class (8px radius, layered shadow matching Craft)
2. **menu-context.tsx** — Extended with MenuSub, MenuSubTrigger, MenuSubContent for polymorphic submenus
3. **sidebar.tsx** — Width: 16rem (256px) → 18.75rem (300px) matching Craft default
4. **new-sidebar.tsx** — Button: removed shadow/bg, added subtle hover (bg-foreground/[0.03]); tooltip: side=bottom with kbd shortcut
5. **dropdown-menu.tsx + context-menu.tsx** — Craft styling: rounded-[4px] items, popover-styled containers, foreground/[0.03] hover, h-3.5 icons, bg-foreground/10 separators
6. **conversation-sidebar-item.tsx** — Full Craft SessionMenu: Share, Status submenu (Todo/In Progress/Done), Labels submenu, Flag, Archive, Mark as Unread, Rename, Regenerate Title, Open in New Panel, Open in New Window, Open, Copy Link, Delete

### Typecheck: PASS (zero errors)
