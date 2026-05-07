---
# ai-nexus-6wxf
title: Polish AutoReviewSelector + harden @octavian-tocan/react-dropdown
status: completed
type: bug
priority: normal
created_at: 2026-05-07T08:32:09Z
updated_at: 2026-05-07T08:41:00Z
---

Fix four issues with the safety-mode dropdown in the chat composer:

1. **Separator on wrong row (consumer + package).** `DropdownList` renders the separator AFTER any item where `getItemSeparator` returns true, but the prop docstring says BEFORE. `AutoReviewSelector` marks 'custom' (last item), so the divider appears below it instead of above the advanced section. Fix the implementation to match the docstring.

2. **Tooltip races back open during dropdown close (consumer).** `AutoReviewSelector` only suppresses the tooltip while `dropdownOpen === true`. When the dropdown closes, the trigger keeps focus and Radix Tooltip fires `onOpenChange(true)` with `data-state=\"instant-open\"`. Replace local state guard with `useTooltipDropdown` (same hook ModelSelectorPopover uses).

3. **Surface tokens mismatch (consumer).** `bg-popover border border-border rounded-lg` instead of the project's `chat-composer-dropdown-menu popover-styled` cascade — different token, different shadow, different radius, no scenic-mode blur. Replace with the chat-composer surface classes used by ModelSelectorPopover.

4. **~500 ms open/close timing (package).** `DropdownRoot.closeDropdown` defers `setIsOpen(false)` and `onOpenChange(false)` by `exitDuration * 1000` while `animationState` (which nothing reads) flips. `DropdownContent` then re-derives its own `exitDuration` window before letting AnimatePresence run. The `motion.div` transition uses `enterDuration` for both directions. Net result: ~300 ms of dead time then ~200 ms fade. Fix: fire state synchronously, drive AnimatePresence directly off `isOpen`, give exit its own duration on the variant.

## Tasks

- [ ] Update package: `DropdownRoot.tsx` fires `setIsOpen` and `onOpenChange` synchronously; track `animationState` via effect (no functional dependency)
- [ ] Update package: `DropdownContent.tsx` drives AnimatePresence off `isOpen` directly; remove `shouldRender` double-buffer; per-variant transitions for enter/exit; `useLayoutEffect` for portal positioning
- [ ] Update package: `DropdownList.tsx` emits separator BEFORE the marked item (matches API.md docstring); use themed `bg-border` instead of hardcoded `gray-200`
- [ ] Update package: `closeImmediate` aliased to `closeDropdown` (drop `skipExitAnimationRef` plumbing); kept in context for backward compat
- [ ] Update package CHANGELOG with bug-fix and timing-fix entries
- [ ] Update `ChatComposerControls.tsx` `AutoReviewSelector`: switch to `useTooltipDropdown`, replace contentClassName, drive trigger active-bg from `menuOpen`
- [ ] Run `bun run typecheck` + `just check` (frontend), fix any fallout
- [ ] Update bean with summary



## Summary of Changes

**Package (`frontend/lib/react-dropdown/`):**
- `DropdownRoot.tsx` — `openDropdown` and `closeDropdown` flip `isOpen` and fire `onOpenChange` synchronously (no more 150 ms dead delay before exit motion starts). `closeImmediate` is now an alias of `closeDropdown`; `skipExitAnimationRef` deleted. `animationState` is still exposed in context but driven by a derived `useAnimationStateTracker` effect — never blocks state propagation.
- `DropdownContent.tsx` — `AnimatePresence` keys directly off `isOpen`; removed the `shouldRender`/`_isClosing` double-buffer that was layering on top of `AnimatePresence`'s own exit handling. Per-variant transitions (`animate` uses `enterDuration`, `exit` uses `exitDuration`) so the two props finally drive their respective timelines independently. Portal positioning moved to `useLayoutEffect` to kill the one-frame flash at `top:0/right:0` on first mount.
- `DropdownList.tsx` — separator emits ABOVE the marked item (matches the existing `getItemSeparator` docstring); suppressed when the item lands at the top of the list or the top of its section. Divider class is now `bg-border` instead of hardcoded `border-gray-200` so it themes correctly.
- `DropdownMenu.tsx` — JSDoc example updated to use `separatorBefore` and explain the above placement.
- `types.ts` — three identical `getItemSeparator` JSDocs collapsed into a single shared description with an `@example`.
- `CHANGELOG.md` — Unreleased Fixed/Changed entries covering separator placement, synchronous state, per-direction motion, themed separator color, and `useLayoutEffect` portal positioning.
- `docs/API.md` — table descriptions for `getItemSeparator` clarified to "render divider ABOVE this item".

**Consumer (`AutoReviewSelector` in `ChatComposerControls.tsx`):**
- Switched from local `dropdownOpen` state + `open={dropdownOpen ? false : undefined}` to `useTooltipDropdown` (the 300 ms ref-backed close-guard hook that ModelSelectorPopover already uses). The trigger active-bg now reads from `menuOpen`.
- `contentClassName` switched from `bg-popover border border-border rounded-lg p-1 min-w-[208px] mb-2` to `chat-composer-dropdown-menu popover-styled p-1 min-w-[208px]`. The project's chained `.chat-composer-dropdown-menu.popover-styled` selector applies `--background-elevated`, `--radius-surface-lg`, the layered popover shadow, and scenic-mode backdrop blur — all of which were missing before. Dead `mb-2` removed (it was on a `position: fixed` portal).
- `getItemSeparator={(mode) => SAFETY_MODE_ADVANCED.has(mode)}` is unchanged textually, but now means "divider above 'custom'" because the package fix corrected the placement semantics.

**Verification:**
- `bunx tsc --noEmit` — zero new type errors in any touched file (pre-existing storybook/test/verbatimModuleSyntax noise unrelated to this work).
- `bunx vitest run --config vitest.config.ts` (run from `lib/react-dropdown`) — 112/112 tests pass before and after.
- `bunx biome check` on touched files — clean except the pre-existing `noUndeclaredDependencies` warning that fires on every consumer of the vendored `@octavian-tocan/react-dropdown` (resolved via `tsconfig` path mapping).
