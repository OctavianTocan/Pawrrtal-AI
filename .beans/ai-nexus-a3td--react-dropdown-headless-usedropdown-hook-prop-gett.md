---
# ai-nexus-a3td
title: 'react-dropdown: headless useDropdown hook + prop getters'
status: in-progress
type: feature
priority: normal
created_at: 2026-05-07T08:45:17Z
updated_at: 2026-05-07T10:29:57Z
---

Add a headless `useDropdown` hook that exposes prop getters (`getTriggerProps`, `getContentProps`, `getItemProps`) in the Headless UI / Downshift / Reach style, so consumers can fully own the markup while keeping the keyboard/focus/aria wiring.

## Why this is its own bean

The current package is component-first: `Dropdown.Root` + `Dropdown.Trigger` + `Dropdown.Content` are tightly coupled to specific JSX. Adding a headless hook is not a layering change — it's a surface-level alternative to the existing components — but doing it right means:

- Extracting all imperative behavior (keyboard nav, focus trap, click-outside, animations, portal) into pure logic that returns prop bags
- Making the existing components a thin layer on top of the hook (otherwise the headless and component APIs drift)
- Working out a story for the trigger/content/item ref forwarding when the consumer renders arbitrary elements
- Documenting two parallel APIs in the docs without confusing readers

## References

- Headless UI `Menu`: https://headlessui.com/react/menu
- Downshift's prop-getters pattern: https://www.downshift-js.com/use-select
- Reach UI `Menu`: https://reach.tech/menu-button

## Touchpoints

- New `useDropdown` hook in `src/`
- Possible refactor of `DropdownRoot` / `DropdownContent` / `DropdownTrigger` to use the hook internally
- New `docs/HEADLESS.md`
- `README.md` update to advertise both APIs
- `CHANGELOG.md`



## Progress 2026-05-07

Headless `useDropdown` hook landed as **additive** API in `frontend/lib/react-dropdown/src/useDropdown.ts`.

### What shipped

- `useDropdown<T>(options)` returning `{ isOpen, open, close, toggle, focusedIndex, setFocusedIndex, getTriggerProps, getContentProps, getItemProps, contentId }`.
- Prop getters (`getTriggerProps`, `getContentProps`, `getItemProps`) accept an optional `userProps` arg; consumer event handlers run BEFORE the hook's handler and can opt out via `event.preventDefault()` (Radix-style merge contract).
- Ref composition via `composeRefs` so consumer refs and the hook's internal refs coexist on the same DOM node — click-outside detection still works when the consumer holds the ref.
- Reuses the existing `useMenuKeyboard` for type-ahead, arrow keys, Home/End, Enter (activate), Space (activate), and Escape (close). Keyboard activation synthesizes a `click()` on the matching DOM element so per-row `onSelect` is the single source of truth.
- Click-outside listener is subscribed only while open; auto-detached on close/unmount.
- 22 new unit tests in `frontend/lib/react-dropdown/src/__tests__/useDropdown.test.tsx` covering state transitions, prop-getter shapes, ref composition, ARIA wiring, click-outside, keyboard opens, item selection, disabled handling, and the user-handler-first contract.
- New `frontend/lib/react-dropdown/docs/HEADLESS.md` (~270 lines) documenting when to use the hook vs the components, the API, examples for portals + motion, ref composition, and caveats.
- `README.md` now advertises both APIs side-by-side.
- `CHANGELOG.md` Unreleased entry under '### Added (headless API)'.

### Verification

- Frontend `bunx tsc --noEmit` clean (0 errors).
- Package vitest 130 → **152 passing** (130 pre-existing + 22 new).

### What was deferred (and why)

The original bean spec called for refactoring `DropdownRoot`/`Trigger`/`Content` to use the new hook internally so the headless and component APIs share one source of truth. That refactor is **deferred** — keeping the existing 130-test suite frozen is the higher priority and the unification can ship as its own PR. The new hook is a parallel API; both will continue to work.

Status: bean stays in-progress until the unification refactor ships.
