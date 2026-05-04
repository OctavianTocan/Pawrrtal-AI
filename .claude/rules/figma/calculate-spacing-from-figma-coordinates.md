---
name: calculate-spacing-from-figma-coordinates
paths: ["**/*.{ts,tsx,css}"]
---

# Calculate Spacing From Figma Object Coordinates, Never Guess

Never guess margins or gaps when implementing a Figma design. The Figma MCP
`get_design_context` output contains absolute pixel positions for every
element. Calculate exact spacing by subtracting adjacent element positions.

## Workflow

1. Note each element's `top` position from the Figma code
2. Calculate gaps: `gap = next.top - (current.top + current.height)`
3. Use exact pixel values as arbitrary values: `mb-[68px]` not `mb-3`

## Verify

"Are there margin/gap values that were chosen by eye instead of calculated
from Figma's absolute positions? Do the computed values match the Figma spec?"

## Patterns

Bad — guessed spacing, doesn't match design:

```tsx
<div className="space-y-4">
  <Heading />
  <Description />
  <Button />
</div>
// mb-3 = 12px, but Figma spec says 68px between heading and description
```

Good — calculated from Figma coordinates:

```tsx
// Figma: heading.top=100, heading.height=32, description.top=200
// gap = 200 - (100 + 32) = 68
<div>
  <Heading className="mb-[68px]" />
  <Description className="mb-[24px]" /> {/* calculated similarly */}
  <Button />
</div>
```
