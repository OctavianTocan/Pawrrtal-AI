---
# pawrrtal-cjoo
title: ChatComposer textarea scroll fade (mask-image, scroll-aware)
status: completed
type: feature
priority: normal
created_at: 2026-05-07T09:31:42Z
updated_at: 2026-05-07T09:57:11Z
---

Add top/bottom fade-mask to the prompt input textarea so users can see when there's more text scrolling above/below.

## Design

E-V1 + E-L2: mask-image gradient + scroll-position-aware visibility.

- Top fade visible only when scrollTop > 0
- Bottom fade visible only when scrollTop + clientHeight < scrollHeight
- 16-24 px fade height
- Static mask, opacity controlled by data-attributes

## Implementation

`frontend/components/ai-elements/prompt-input-textarea.tsx` is a Textarea wrapper. Add:

1. Wrap in a relative container with the textarea inside (the textarea handles its own scrolling).
2. `useEffect` watches scroll/resize on the textarea, sets `data-can-scroll-up` and `data-can-scroll-down` on the container.
3. Container styling:

```css
.prompt-textarea-container {
  mask-image: linear-gradient(
    to bottom,
    transparent 0%,
    black var(--top-fade, 0px),
    black calc(100% - var(--bottom-fade, 0px)),
    transparent 100%
  );
}
.prompt-textarea-container[data-can-scroll-up='true'] { --top-fade: 24px; }
.prompt-textarea-container[data-can-scroll-down='true'] { --bottom-fade: 24px; }
```

Reference pattern: `frontend/components/ui/entity-row.tsx:207-210` uses mask-image gradient on a horizontal axis for badge truncation.

## Tasks

- [ ] Create scroll-aware hook `useScrollEdges` returning `{canScrollUp, canScrollDown}`
- [ ] Update `prompt-input-textarea.tsx` to wrap textarea in fade container
- [ ] Wire data attributes from hook
- [ ] Add CSS to globals.css under utilities layer
- [ ] Test: short message (no fade), long message (both fades visible while scrolling middle, only top when at bottom, only bottom when at top)



## Summary

- New file `frontend/hooks/use-scroll-edges.ts` — `useScrollEdges<T>(ref)` returns `{canScrollUp, canScrollDown}`, watches `scroll` + `ResizeObserver` on the element. Stable referential equality (only updates state when edges change) so consumers can safely use the result in render.
- `prompt-input-textarea.tsx` — wraps `InputGroupTextarea` with the hook; sets `data-scroll-up` / `data-scroll-down` data attributes (only present when true so they participate in CSS attribute selectors cleanly).
- `globals.css` — three CSS rules under `[data-prompt-textarea]` toggle the mask-image gradient based on which edge has more content: top fade only, bottom fade only, both fades when scrollable in both directions. 16 px fade height, tuned to be ambient.
- Verified: `tsc --noEmit` clean; tests still 130/130.
