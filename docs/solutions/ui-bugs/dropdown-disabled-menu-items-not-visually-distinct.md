---
title: Disabled dropdown rows looked the same as enabled rows
category: ui-bugs
tags:
  [
    tailwind-v4,
    react-dropdown,
    dropdown-menu,
    submenu,
    disabled-state,
    @source,
    ai-nexus,
  ]
symptoms:
  - DropdownMenuItem with disabled=true showed little or no difference from enabled rows
  - Tweaks to data-disabled opacity / muted text in the package still looked wrong
root_cause: >-
  (1) Tailwind did not emit utilities whose only occurrences lived under the linked
  package frontend/lib/react-dropdown/src, so disabled-related classes never appeared
  in the compiled CSS. (2) Even when present, opacity-only disabled styling was too
  subtle against transparent enabled rows that already use muted icons.
---

## Problem

Profile menu items such as “Get apps and extensions” and “Gift AI Nexus” were marked
`disabled`, but users could not **see** that they were unavailable—styling did not
land or did not contrast enough with normal rows.

## Solution

### 1. Register the linked package with Tailwind v4

In `frontend/app/globals.css`, immediately after the `@import` lines, add:

```css
@source "../lib/react-dropdown/src";
```

So scans include `frontend/lib/react-dropdown/src/**/*.tsx` where
`DropdownMenuItem` default class names are defined. Without this, arbitrary-only
class strings in that package may never generate CSS.

### 2. Style `:disabled` rows distinctly in the primitive

Shared Tailwind chunk **`MENU_ROW_DISABLED_VISUAL_CLASSNAME`** lives in
**`frontend/lib/react-dropdown/src/menu-row-disabled-visual.ts`** and is composed
into **`DEFAULT_ITEM_CLASSNAME`** in **`DropdownPanelItems.tsx`**. Disabled
appearance uses **native `disabled:*`** variants on the `<button>` (not only
`data-disabled:*`). Rows get a **persistent muted tray** so they never read as
empty/transparent like enabled rows:

- `disabled:bg-muted/50` (and the same on hover/focus/active so the row does not
  flash the interactive hover wash)
- `disabled:text-muted-foreground`
- `disabled:[&>svg:not([class*='text-'])]:text-muted-foreground/55` for Lucide
  icons without explicit `text-*` classes

Keep `data-disabled` on the element if tests or selectors rely on it; behavior is
unchanged.

### 3. Optional: disable a submenu trigger + its items

**`DropdownSubmenuTrigger`** supports **`disabled`** (see **`DropdownSubmenu.tsx`**):
same **`MENU_ROW_DISABLED_VISUAL_CLASSNAME`**, no hover-open / keyboard-open, native
**`disabled`** on the `<button>`. Pair with **`DropdownMenuItem disabled`** on each
child row. Example: profile menu **Learn more** in **`frontend/components/nav-user.tsx`**.

### 4. Consumer usage

Single rows: `<DropdownMenuItem disabled …>` only. Submenus: disabled trigger **and**
disabled items if the flyout should not be used.

## Prevention

- When adding or linking a local UI package consumed via TypeScript path aliases,
  confirm its directory is covered by Tailwind’s content scan (`@source` or
  equivalent).
- For “disabled” menu rows, prefer a **surface cue** (muted band) plus label/icon
  tone, not opacity alone.

## References

- `frontend/app/globals.css` (`@source` for react-dropdown)
- `frontend/lib/react-dropdown/src/menu-row-disabled-visual.ts` (`MENU_ROW_DISABLED_VISUAL_CLASSNAME`)
- `frontend/lib/react-dropdown/src/DropdownPanelItems.tsx` (`DEFAULT_ITEM_CLASSNAME`)
- `frontend/lib/react-dropdown/src/DropdownSubmenu.tsx` (`DropdownSubmenuTrigger` + `disabled`)
- `DESIGN.md` — **Components** → `dropdown-menu-item-disabled` and **Menu primitives**
