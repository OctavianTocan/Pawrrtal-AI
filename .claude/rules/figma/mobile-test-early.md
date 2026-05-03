---
name: mobile-test-early
paths: ["**/*.{ts,tsx,css}"]
---

# Test Mobile Viewport Immediately

When a component renders differently on mobile (BottomSheet vs Modal),
test the mobile viewport immediately after the desktop implementation.
Background images and overlays that work on desktop often break on mobile:

- BottomSheet is taller → exposes lighter portions of background images
- `sheetStyle` and content `style` are separate → duplicate backgrounds misalign
- `mix-blend-screen` and opacity overlays brighten more on taller containers
- Gradient cutoff at sheet bottom when content doesn't fill the sheet

## Verify

"Was the mobile viewport tested immediately after the desktop implementation?
Does the background extend to the full sheet height without cutoff?"

## Patterns

Bad — desktop-only testing, mobile breaks silently:

```text
1. Implement background overlay on desktop Modal
2. Ship without testing mobile BottomSheet
3. Mobile users see bright background, gradient cutoff at sheet bottom
// Mobile uses a different container with different height
```

Good — test both viewports immediately:

```text
1. Implement background overlay for desktop Modal
2. Immediately test mobile BottomSheet viewport
3. Fix background extension for sheet height
4. Adjust gradient to cover full sheet
5. Verify both viewports pass pixel diff
```
