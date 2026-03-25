# Craft-Style Button Rules

Use these rules for any button intended to match the compact Craft-like control style used for the New Session action.

- Keep geometry tight: prefer compact height, small horizontal padding, and rounded corners that read like a menu row instead of a large CTA.
- Default state should be quiet: use a low-contrast background and a light shadow so the button is visible without looking filled or loud.
- Do not introduce heavy borders: avoid full-strength strokes, dark outlines, or separator-like edge noise unless a border is functionally required.
- Hover, active, and pressed states should shift slightly: adjust background, shadow, or inset treatment by a small step instead of switching to saturated colors.
- Focus must be obvious: keep `cursor-pointer`, preserve keyboard focus visibility, and use a restrained but clear focus ring that does not change layout.
- Icon and label must scan fast: use a small icon, consistent gap, medium-weight label, and avoid oversized glyphs or wide spacing.
- Keep label copy short: this style works best with 1 to 3 words and no secondary helper text inside the button.
- Match row rhythm: align button height, radius, and padding with adjacent sidebar rows or menu items so it feels native to the surface.

## Good

```tsx
<button
  className="inline-flex h-8 items-center gap-2 rounded-lg bg-neutral-100/90 px-3 text-sm font-medium text-neutral-900 shadow-sm transition-[background-color,box-shadow] hover:bg-neutral-100 hover:shadow active:bg-neutral-200/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400/60 cursor-pointer"
>
  <Plus className="size-4" />
  <span>New Session</span>
</button>
```

Why this works: compact height, quiet baseline fill, light shadow, small icon gap, and state changes that stay within the same tonal range.

## Bad

```tsx
<button className="inline-flex h-11 items-center gap-3 rounded-2xl border border-neutral-300 bg-white px-5 text-sm font-semibold text-blue-600 shadow-md hover:bg-blue-600 hover:text-white">
  <Plus className="size-5" />
  <span>Create a New Session</span>
</button>
```

Why this fails: too tall, too much border and shadow weight, oversized spacing, and hover state jumps to a different color story.
