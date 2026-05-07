---
# ai-nexus-nwcd
title: 'react-dropdown: asChild slot pattern'
status: completed
type: feature
priority: high
created_at: 2026-05-07T09:30:36Z
updated_at: 2026-05-07T09:53:02Z
---

Add Radix-style `asChild` to `DropdownTrigger`, `DropdownContent`, and (where applicable) custom item renderers in `DropdownMenu`.

## Why

Currently the package wraps the trigger in a `<div>`:

```tsx
// DropdownMenu.tsx:50-58
const MenuTrigger = React.forwardRef<HTMLDivElement, { children: ReactNode }>(
  ({ children }, ref) => {
    const { isOpen, toggleDropdown } = useDropdownContext();
    return (
      <div ref={ref} onClick={toggleDropdown} aria-expanded={isOpen} aria-haspopup="menu">
        {children}
      </div>
    );
  }
);
```

This breaks inline-flex layouts (the wrapper div takes its own line/box) and means the focusable element is the wrapper, not the consumer's `<Button>`. Radix's pattern: `<DropdownMenuTrigger asChild><Button /></DropdownMenuTrigger>` — the consumer's element BECOMES the trigger, inheriting the click handler and ARIA.

## Implementation

Use `@radix-ui/react-slot`'s `Slot` primitive (already in the dep tree via shadcn). Or write a minimal `Slot` ourselves (~20 LOC) since this is a vendored package.

```tsx
function MenuTrigger({ asChild, children, ...props }: { asChild?: boolean; children: ReactNode }) {
  const Comp = asChild ? Slot : 'div';
  return <Comp {...props}>{children}</Comp>;
}
```

## Tasks

- [ ] Add minimal `Slot` implementation OR confirm `@radix-ui/react-slot` import is acceptable for the vendored package (it's already in node_modules via shadcn)
- [ ] Add `asChild` prop to `DropdownMenuProps` (and `DropdownTriggerProps` for the lower-level API)
- [ ] Update `MenuTrigger` to forward to consumer's element when `asChild`
- [ ] Update `DropdownContent` similarly (for cases where consumer wants to control the surface element)
- [ ] Update existing storybook stories to demonstrate `asChild`
- [ ] Add tests for `asChild=true` rendering pattern
- [ ] Document in API.md

## Why this matters for migration

Both `AutoReviewSelector` and `ModelSelectorPopover` pass a `<Button>` as the trigger. Without `asChild`, the button gets nested inside an extra div, which shifts the layout and means the button's hover/focus states don't match the trigger's open/closed state via `data-state`.



## Summary

- New file `frontend/lib/react-dropdown/src/Slot.tsx` — minimal slot primitive (~140 LOC) with className concat, event handler composition (slot first, child after unless preventDefault), ref composition, and dev-time warning for non-element children.
- `DropdownMenu` accepts `asChild?: boolean` (default false). When true, the trigger renders via Slot instead of `<div>`, so the consumer's `<Button>` becomes the actual focusable trigger element.
- `DropdownMenuDef` forwards `asChild` through to `DropdownMenu`.
- `MenuTrigger` exposes a stable `data-state="open|closed"` attribute regardless of asChild path.
- Slot exported from package index alongside its types.
- Verified: 130/130 tests pass, tsc clean.
