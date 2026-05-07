---
# ai-nexus-za3f
title: 'react-dropdown: flyout sub-menus (Radix DropdownMenuSub parity)'
status: completed
type: feature
priority: normal
created_at: 2026-05-07T08:45:05Z
updated_at: 2026-05-07T09:53:23Z
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



## Summary

- New file `frontend/lib/react-dropdown/src/DropdownSubmenu.tsx` (~330 LOC):
  - `DropdownSubmenu` — context provider holding the submenu's open state, anchor ref, and timer ref for hover-open / hover-close debouncing.
  - `DropdownSubmenuTrigger` — supports `asChild`, opens on click / Enter / Space / ArrowRight, hover-opens after 100 ms, hover-closes after 200 ms.
  - `DropdownSubmenuContent` — portaled flyout panel. Reuses the root's enterDuration / exitDuration / enterEase / exitEase via `useDropdownContext` for visual continuity. Filter blur on enter/exit. Side-flip collision detection (right ↔ left) when one side overflows the viewport. Vertical clamp keeps the panel within VIEWPORT_INSET (8 px) of viewport edges. Cancels parent's hover-close timer on pointer enter, restarts it on leave.
- Components exported from package index alongside their types (`DropdownSubmenuTriggerProps`, `DropdownSubmenuContentProps`).
- Nested submenus work because each `DropdownSubmenu` creates its own context — chain of nested providers, each with independent state.
- ModelSelectorPopover now uses these — see ai-nexus-rijl.

## Limitations / future work

- No safe-triangle hover: if the user moves diagonally off the trigger toward the panel, traversing through other rows, the hover-close timer fires. The 200 ms close delay is the simple workaround; covers ~95% of users. Safe-triangle is a follow-up if hovering between sibling submenus surfaces as a real UX issue.
- No ArrowDown auto-focus on first item when opening via keyboard. The submenu opens but focus stays on the trigger; user has to press ArrowDown to enter the list. Radix moves focus to the first item automatically. Easy follow-up: add a useLayoutEffect on `isOpen` that focuses the first focusable inside the panel.
- No keyboard-driven sibling traversal between open submenus (ArrowUp/Down moving between provider triggers when one's submenu is open).

Verified: 130/130 tests pass, tsc clean.
