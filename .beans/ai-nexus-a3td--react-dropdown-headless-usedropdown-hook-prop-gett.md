---
# ai-nexus-a3td
title: 'react-dropdown: headless useDropdown hook + prop getters'
status: todo
type: feature
priority: normal
created_at: 2026-05-07T08:45:17Z
updated_at: 2026-05-07T08:45:17Z
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
