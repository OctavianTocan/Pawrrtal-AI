---
# ai-nexus-6omu
title: 'react-dropdown: align + alignOffset + continuous collision'
status: completed
type: feature
priority: high
created_at: 2026-05-07T09:30:47Z
updated_at: 2026-05-07T09:53:10Z
---

Match Radix's positioning surface so the package can replace Radix DropdownMenu in ModelSelectorPopover.

## Currently

`DropdownContent` always pins the right edge to the trigger's right edge (`portalPosition.right = window.innerWidth - rect.right`). `offset` is the only positioning knob.

## Adding

### `align` prop ('start' | 'center' | 'end')

Mirrors Radix `<DropdownMenuContent align>`. Default 'end' for backward compatibility (matches current behavior).

- 'start' → left edge of content aligned to left edge of trigger
- 'center' → content centered horizontally over trigger
- 'end' → right edge of content aligned to right edge of trigger

### `alignOffset` prop (number, default 0)

Pixels added to the alignment axis. Useful when the visual anchor inside the trigger differs from its bounding box edge.

### Continuous collision repositioning

My current implementation flips placement once on open via `useLayoutEffect` + `ResizeObserver` on content size. Radix re-evaluates on:
- window resize
- scroll (any ancestor)
- pointer events that scroll the page
- content size changes (already handled)

Add a global resize/scroll listener while the dropdown is open. Throttle via `requestAnimationFrame`. Re-run the placement decision and update `portalPosition`.

## Tasks

- [ ] Add `align`, `alignOffset` to `DropdownRootProps` and `DropdownContextValue`
- [ ] Update `DropdownContent` portal positioning math to honor align + alignOffset
- [ ] Add window resize listener while open
- [ ] Add ancestor scroll listeners (capture phase, deepest scrollable ancestor of triggerRef)
- [ ] Throttle reposition via rAF
- [ ] Tests for align positions and alignOffset values
- [ ] Tests for collision repositioning on viewport resize



## Summary

- New `align` prop on `DropdownRoot` ('start' | 'center' | 'end', default 'end'). Threaded through context to `DropdownContent`'s portal positioning math.
- New `alignOffset` prop (number, default 0). Pixel offset added to the alignment axis.
- `portalPosition` state restructured to `{top, bottom, left, right}` discriminated by which side is anchored, so 'end' alignment uses `right:`, 'start' / 'center' use `left:`, and 'top' / 'bottom' placement uses the corresponding vertical anchor.
- 'center' alignment uses `contentEl.offsetWidth` for the math; works after the first render frame.
- New continuous-repositioning effect — listens to `window resize` + capture-phase `window scroll` while open, throttled via `requestAnimationFrame`. Updates portal position when ancestor scrolls or viewport resizes. Cleans up listeners + cancels rAF on close / unmount.
- Type `DropdownAlign` exported.
- Verified: 130/130 tests pass, tsc clean.
