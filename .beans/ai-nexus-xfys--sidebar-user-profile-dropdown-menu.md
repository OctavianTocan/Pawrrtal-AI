---
# ai-nexus-xfys
title: Sidebar user profile dropdown menu
status: in-progress
type: feature
priority: normal
created_at: 2026-05-04T20:18:51Z
updated_at: 2026-05-04T20:21:21Z
---

Add a user profile button to the bottom of the navbar that opens a Claude.ai-style dropdown menu when clicked.

## Design (from reference screenshots)
- Trigger: avatar + name + plan subtitle + selector chevron, anchored at the bottom of the sidebar
- Menu contents (top to bottom):
  - Email label
  - Settings (with kbd shortcut hint)
  - Language (submenu)
  - Get help
  - --- separator ---
  - View all plans
  - Get apps and extensions
  - Gift AI Nexus
  - Learn more (submenu)
  - --- separator ---
  - Log out

## Decisions
- Reuses the project Radix DropdownMenu (per c70b79d: react-dropdown stays paused, action menus stay on Radix)
- Opens upward (side="top") since trigger is at the bottom
- Hidden when desktop sidebar is collapsed
- User data passed via props for now (no client auth context yet)

## Todo
- [x] Rewrite components/nav-user.tsx to match the Claude.ai layout
- [x] Wire NavUser into the SidebarFooter slot in app-layout.tsx (desktop + mobile)
- [x] Run biome + tsc on touched files
- [ ] Manual smoke check via running dev server (caller decides when)
