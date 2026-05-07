---
# ai-nexus-za3f
title: 'react-dropdown: flyout sub-menus (Radix DropdownMenuSub parity)'
status: todo
type: feature
priority: normal
created_at: 2026-05-07T08:45:05Z
updated_at: 2026-05-07T08:45:05Z
---

Replace `DropdownMenuDef`'s inline accordion submenu with a real flyout that opens to the side, similar to Radix's `DropdownMenuSub` / `DropdownMenuSubContent`.

## Why this is its own bean

Implementing flyout submenus requires:
- A second `DropdownContent`-style portal positioned relative to the parent item's bounding rect (not the dropdown root's trigger)
- Hover-to-open + close timing, including the 'safe triangle' grace-area technique so users can move the mouse diagonally toward the submenu without accidentally closing it
- ArrowRight / ArrowLeft keyboard traversal between parent and child panels, with the active panel propagating focus
- A nested context layer so each sub-menu has its own open state, focused index, click-outside scope, and closes its parent chain on Escape
- Collision flipping that propagates from parent placement (right-side flyout might need to flip to the left if it overflows)

This is structural work that's better as a focused pass than crammed into a polish bean.

## References

- Radix `DropdownMenuSub`, `DropdownMenuSubTrigger`, `DropdownMenuSubContent` semantics
- 'Safe triangle' algorithm: https://www.smashingmagazine.com/2018/01/dropdown-menu-css/

## Touchpoints

- New `DropdownSubmenu` component
- Extension of `MenuItemDef` 'submenu' rendering in `DropdownMenuDef`
- New `DropdownSubContext` for nested state
- Update `docs/API.md`, `docs/EXAMPLES.md`, `CHANGELOG.md`
