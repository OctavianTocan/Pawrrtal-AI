# Hidden Overlay Pointer Events

When hiding an overlay or backdrop with `opacity-0`, always pair it with
`pointer-events-none` and restore `pointer-events-auto` when visible.
An element at `opacity-0` is invisible but still captures mouse and touch
events, creating "dead zones" where clicks silently fail to reach the
elements underneath.

## Verify
"Does every overlay that transitions via opacity also toggle
pointer-events-none/auto? Could an invisible overlay be stealing clicks?"

## Patterns

Bad -- hidden overlay still captures clicks:

```tsx
<div
  className={cn(
    "fixed inset-0 bg-black/50 transition-opacity",
    isOpen ? "opacity-100" : "opacity-0"
  )}
/>
```

Good -- pointer events disabled when hidden:

```tsx
<div
  className={cn(
    "fixed inset-0 bg-black/50 transition-opacity",
    isOpen
      ? "opacity-100 pointer-events-auto"
      : "opacity-0 pointer-events-none"
  )}
/>
```
