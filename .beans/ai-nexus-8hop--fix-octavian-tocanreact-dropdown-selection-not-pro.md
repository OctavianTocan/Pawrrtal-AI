---
# ai-nexus-8hop
title: Fix @octavian-tocan/react-dropdown — selection not propagating reliably
status: todo
type: bug
priority: high
created_at: 2026-05-07T17:25:21Z
updated_at: 2026-05-07T17:25:21Z
---

## Symptoms

Multiple dropdowns across the app fail to register a selection click:

- **Settings → Appearance → Whimsy → Source/Preset** (now bypassed with a button-pair + thumbnail grid in commit ``0ceb73c``).
- **Settings → most other dropdowns** (per user report 2026-05-07).
- **Home page → chat composer Permission mode dropdown** (e.g. "Default permissions" → can't change).
- **Sidebar → user profile dropdown → Settings item** intermittently doesn't navigate to ``/settings``.

In every case the dropdown opens, the option list renders, the user clicks an item — and nothing happens (no selection, no navigation, no state change).

## Source

The vendored library at ``frontend/lib/react-dropdown/`` (``@octavian-tocan/react-dropdown``). Used by:

- ``frontend/components/ui/select-button.tsx`` (everywhere a ``SelectButton`` is rendered)
- ``frontend/features/chat/components/ModelSelectorPopover.tsx``
- ``frontend/features/chat/components/ChatComposerControls.tsx`` (permission mode)
- ``frontend/features/sidebar/...`` user-profile dropdown
- many other places — a project-wide grep on ``DropdownMenu`` from this package surfaces them all.

## Diagnosis hypotheses

(These are guesses to validate, not findings.)

1. **Portal click leak.** The DropdownMenu uses ``usePortal`` and renders content in ``document.body``. Some ancestor stops propagation on pointerdown/click and prevents the renderItem button's ``onClick`` from firing. The Settings page being inside a Radix ``Dialog`` or shadcn ``Sheet`` can intercept events from outside the portal.
2. **State machine race.** ``resolvedOnSelect`` calls ``selectHandler(item)`` then ``closeDropdown()``. If ``closeDropdown`` synchronously unmounts the option element, React may abort the click handler before it completes the React state setter. The library should defer ``closeDropdown`` to a microtask.
3. **StrictMode + persisted-state.** ``usePersistedState``'s ``useSyncExternalStore`` snapshot might be cached against a key that doesn't refresh after the writer dispatches. Bypassing SelectButton (the Source toggle) fixed it for that one case, suggesting state-related rather than DOM-event-related — but multiple unrelated dropdowns failing makes a generic library bug more likely.
4. **Hot-reload pollution.** Possible the issue only appears in dev after HMR; needs a full reload + production build to rule out.

## Investigation plan

- [ ] **Add console.log instrumentation** to ``DropdownList.tsx``'s ``resolvedOnSelect`` and confirm whether the handler runs at all when the user clicks.
- [ ] **Repro on a fresh tab** with localStorage cleared, no extensions, production build. Determines whether HMR is involved.
- [ ] **Test in isolation** — a minimal page with a single SelectButton calling ``console.log`` on select. If THAT works, the bug is contextual (parent intercepts events). If not, it's intrinsic to the library.
- [ ] **Compare with the upstream package** — the vendored ``frontend/lib/react-dropdown/`` was pulled from a published package. Diff against the current published version to see whether there's a known fix downstream.
- [ ] **Look at recent project changes** that touched event-handling globals — e.g. global ``pointerdown`` listeners, error boundaries, focus traps, the new ``ResponsiveModal`` wrappers.

## Acceptance

- All four user-reported broken surfaces (whimsy preset picker, settings dropdowns, chat permission dropdown, user-profile → settings) work consistently across cold load, navigation, and HMR.
- A small Playwright spec covers each surface so regressions get caught.
- The whimsy preset picker can be reverted to a SelectButton (or any other dropdown) without re-introducing the bug — current thumbnail grid is a workaround, not the long-term shape.

## Related

- ai-nexus-s8na (whimsy generator) — currently bypassing SelectButton for the Mode toggle and Preset picker; revertible once the library is fixed.

## Workaround note

The whimsy bypass (segmented buttons + thumbnail grid) is fine UX for this one feature, but we cannot keep replacing every dropdown that breaks. The library has to actually work — model selectors, permission modes, and user-profile menus are too central to the app to bypass.
