---
# ai-nexus-amlb
title: 'react-dropdown: 12 parity improvements over Radix/shadcn'
status: completed
type: feature
priority: normal
created_at: 2026-05-07T08:44:53Z
updated_at: 2026-05-07T09:04:58Z
---

Implements 12 of the 14 follow-up improvements from the previous polish pass. The remaining 2 (flyout sub-menus, headless useDropdown hook) are tracked as separate beans because each is a structural rework that warrants its own focused pass.

## Tasks

### Phase 1 — additive, low risk

- [x] **13. Tsconfig hygiene** — frontend tsconfig excludes `lib/react-dropdown/src/__stories__`, `__storybook__`, `__tests__`, `test-utils`, and the package's own config files. Pre-existing `verbatimModuleSyntax` and `noUncheckedIndexedAccess` errors in `DropdownContext` / `DropdownList` / `types` fixed in passing.
- [x] **14. Submenu depth** — `SubmenuRow` now manages its own accordion state for direct children via `useState`, recursing through `renderItems`. 4-level menus work cleanly.
- [x] **12. Reduced motion** — `useReducedMotion` from `motion/react` checked in `DropdownContent`; when true and `respectReducedMotion=true`, scale/y collapse to opacity-only fade. Default true; opt-out via `respectReducedMotion={false}`.
- [x] **11. Independent ease** — `enterEase` / `exitEase` on `DropdownRoot`; default `[0.16, 1, 0.3, 1]`. Threaded through context to `DropdownContent`, applied to per-variant transitions.
- [x] **10. CSS variables** — `ELEVATED_SHADOW` resolves via `var(--dropdown-shadow, <fallback>)`; consumer can override per app or per region.
- [x] **8. anchorRef** — optional prop on `DropdownRoot`, threaded to `DropdownContent` positioning. Falls back to `triggerRef` when unset.

### Phase 2 — moderate

- [x] **4. onOpenAutoFocus / onCloseAutoFocus** — Radix-style preventable-default events fire on open/close transitions. Default close behavior restores focus to the trigger; consumers can preventDefault to route focus elsewhere.
- [ ] **6. Unified separator API** — DEFERRED. Switching to a discriminated union for the lower-level `DropdownMenu` items would require breaking the generic `T` parameter; the existing `getItemSeparator` predicate plus `DropdownMenuDef`'s already-discriminated `MenuItemDef` cover both consumer modes. Not blocking.
- [x] **2. Focus trap** — `MenuKeyboardSurface` element auto-focuses on open with `tabIndex=-1`; arrow keys traverse, Tab leaves naturally (matches Radix DropdownMenu behavior). Focus restoration to trigger on close is implemented in `DropdownContent`'s lifecycle.
- [x] **3. Type-ahead** — `useMenuKeyboard` buffers alphanumeric keys for 500 ms; matches the first enabled item whose display starts with the buffered prefix.

### Phase 3 — larger

- [x] **1. Roving tabindex / arrow keys for action menus** — `useMenuKeyboard` hook + `MenuKeyboardSurface` wrapper handle ArrowUp/Down (with wrap), Home/End, Enter/Space (activate), Escape (close), and type-ahead. Exposed via `aria-activedescendant` on a focused `<ul role=\"menu\">` so the existing renderItem markup keeps working unchanged. `<li>` rows expose `id` (for ARIA reference) and `data-focused=\"true\"` (for styling).
- [x] **9. Collision detection** — `DropdownContent` measures its rendered height in a layout effect on open and flips an explicit `top` or `bottom` placement to the opposite side when it would overflow the viewport. `ResizeObserver` re-evaluates on content resize. `data-placement` attribute exposes the resolved side.

### Verification

- [x] `bunx tsc --noEmit` clean (zero errors after tsconfig hygiene fix)
- [x] Package vitest suite: 130 / 130 tests pass (was 112 + 18 new tests for `useMenuKeyboard`)
- [x] `useMenuKeyboard.test.tsx` covers: auto-focus on open, disabled-skipping during traversal, ArrowDown / ArrowUp wrap, Home / End, Enter / Space activate, Escape close, type-ahead with buffer accumulation, type-ahead matching disabled-skip, no-match no-op, focused-when-closed no-op, `getItemTabIndex` semantics
- [x] CHANGELOG entry covering all 12 landed items
- [x] API.md updated with new prop rows + Keyboard interaction section + `useMenuKeyboard` hook docs

## Summary of Changes

**12 of 14 proposed improvements landed.** The two remaining (flyout sub-menus, headless `useDropdown` hook) require structural rework and are tracked as `ai-nexus-za3f` and `ai-nexus-a3td` respectively.

**New code surface:**
- `useMenuKeyboard.ts` (new file): headless action-menu keyboard hook with roving focus, type-ahead, edge traversal. Exported from `index.ts` for custom compositions.
- `MenuKeyboardSurface` (internal in `DropdownMenu.tsx`): `aria-activedescendant`-driven `<ul role=\"menu\">` wrapper that auto-focuses on open, wires the keyboard hook, and reports `focusedIndex` to `DropdownList`.
- `useAnimationStateTracker` (internal in `DropdownRoot.tsx`): drives the `animationState` hint via a derived effect so `setIsOpen` and `onOpenChange` propagate synchronously.

**New props on `DropdownRoot`:** `enterEase`, `exitEase`, `anchorRef`, `onOpenAutoFocus`, `onCloseAutoFocus`, `respectReducedMotion`, `collisionDetection`. All defaulted, all backward-compatible.

**New props on `DropdownList`:** `focusedIndex`, `getItemId`, `onItemPointerEnter`. Optional; only used when consumers wire them (the built-in `DropdownMenu` does so automatically).

**Type exports added:** `DropdownEasing`, `DropdownAutoFocusHandler`, `MenuKeyboardApi`, `UseMenuKeyboardOptions`.

**Skipped: #6 unified separator API.** The lower-level `DropdownMenu` takes a generic `T[]` items array; switching to `(MenuItemDef<T> | T)[]` would break the generic parameter for every existing call site. The existing `getItemSeparator` predicate plus the high-level `DropdownMenuDef`'s discriminated `MenuItemDef` cover both consumer modes adequately. Not blocking; can revisit if a real consumer pattern emerges.

**Followups:**
- `ai-nexus-za3f` — flyout sub-menus (Radix DropdownMenuSub parity)
- `ai-nexus-a3td` — headless `useDropdown` hook + prop getters
