---
name: Radix Tooltip Reopens After Dropdown Close — Fix with setTimeout(150), Not rAF
paths: ["**/*.{ts,tsx}"]
---

# Radix Tooltip Reopens After Dropdown Close — Use setTimeout(150), Not rAF

## The bug

When a Radix `<Tooltip>` wraps a `<DropdownMenuTrigger>`, closing the dropdown
causes the tooltip to reappear immediately — even when the cursor is not hovering.
The user is forced to click elsewhere to dismiss it. This happens because:

1. Radix's `FocusScope` restores focus to the trigger inside a **`useEffect` cleanup**,
   which fires **after browser paint**.
2. When the dropdown closes, `menuOpen` is set to `false` synchronously. The trigger
   regains focus a few milliseconds later, and Radix fires `onOpenChange(true)` on
   the Tooltip (with `data-state="instant-open"` — focus-triggered, no delay).
3. By the time that focus-return fires, `menuOpen` is already `false`, so a naive
   guard (`if (menuOpen) return`) does not catch it.

## The wrong fix

Using `requestAnimationFrame` to clear the closing guard:

```tsx
// BROKEN — rAF fires BEFORE paint, BEFORE Radix's useEffect focus-return
requestAnimationFrame(() => {
  isMenuClosingRef.current = false;
});
```

`rAF` fires before the browser paints, which is **before** Radix's `useEffect`
cleanup runs. The guard is cleared too early and the focus-triggered open slips through.

## The correct fix

Use `setTimeout(150)` instead. 150 ms is well past the ~16 ms it takes for Radix's
`useEffect` cleanup to execute, so the guard is still active when the focus-return
fires `onOpenChange(true)`.

```tsx
const isMenuClosingRef = useRef(false);
// Needed to cancel a pending clear if the dropdown reopens quickly.
const closingTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

// Inside DropdownMenu.onOpenChange:
onOpenChange={(open) => {
  setMenuOpen(open);
  if (!open) {
    isMenuClosingRef.current = true;
    setTooltipOpen(false);
    // 150 ms keeps the guard alive through Radix's useEffect focus-return
    // (~16 ms), absorbing the focus-triggered onOpenChange(true) on the
    // Tooltip before clearing.
    clearTimeout(closingTimerRef.current);
    closingTimerRef.current = setTimeout(() => {
      isMenuClosingRef.current = false;
    }, 150);
  }
}}

// Inside Tooltip.onOpenChange:
onOpenChange={(open) => {
  if (menuOpen || isMenuClosingRef.current) return;
  setTooltipOpen(open);
}}
open={menuOpen ? false : tooltipOpen}
```

## Why 150 ms

- Radix's `useEffect` focus restoration typically runs within 16-30 ms.
- `requestAnimationFrame` fires at ~16 ms — too soon, the guard is cleared.
- `setTimeout(0)` is similarly unreliable; it may batch before the next paint.
- `setTimeout(150)` is safely past any async focus side-effect while still
  short enough that normal hover after 150 ms works correctly.

## Where this pattern is used

- `frontend/features/chat/components/ChatComposerControls.tsx` — `AutoReviewSelector`
- `frontend/features/chat/components/ModelSelectorPopover.tsx` — `ModelSelectorPopover`

## Verify

"Does this Tooltip sit next to or inside a DropdownMenuTrigger? Is the closing
guard cleared with `setTimeout(150)` and a `closingTimerRef`? Is `clearTimeout`
called before each new timer to avoid stale clears?"
