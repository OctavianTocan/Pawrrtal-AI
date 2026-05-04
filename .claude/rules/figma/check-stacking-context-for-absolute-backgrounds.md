---
name: check-stacking-context-for-absolute-backgrounds
paths: ["**/*.{ts,tsx,css}"]
---

# Absolute-Positioned Backgrounds Disappear When a Parent Creates a New Stacking Context

When adding an absolutely-positioned element as a background layer, every
sibling content element must have `relative` (or explicit `z-index`) to
appear above it. The parent's `relative` creates a positioning context
but does NOT elevate its static children above absolute siblings.

Also required on the background image element:

- `pointer-events-none` — prevents capturing clicks meant for content
- `max-w-none` — overrides Tailwind's default max-width on images
- `aria-hidden` — removes from accessibility tree

## Verify

"Did I add an absolutely-positioned background? Do all content siblings
have `relative` to appear above it? Does the image have pointer-events-none,
max-w-none, and aria-hidden?"

## Patterns

Bad — content siblings lack `relative`, hidden behind background:

```tsx
<section className="relative">
  <img src="bg.jpg" className="absolute inset-0 w-full h-full object-cover" />
  <h2>Title</h2>
  <p>Content hidden behind the image</p>
</section>
```

Good — content siblings have `relative`, background is non-interactive:

```tsx
<section className="relative">
  <img
    src="bg.jpg"
    className="absolute inset-0 w-full h-full object-cover pointer-events-none max-w-none"
    aria-hidden
    alt=""
  />
  <h2 className="relative">Title</h2>
  <p className="relative">Content visible above the background</p>
</section>
```
