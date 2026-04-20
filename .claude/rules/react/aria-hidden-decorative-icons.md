---
description: Decorative icons must be hidden from the accessibility tree
globs: frontend/**/*.tsx
---
# Aria Hidden on Decorative Icons

All decorative icons (SVGs, Lucide components, icon fonts) must have
`aria-hidden="true"`. If an icon conveys meaning that isn't duplicated by
adjacent text, give it an accessible label instead.

Consistency matters: if two icons in a row have `aria-hidden` and a third
doesn't, screen readers announce the third as unlabeled image content, which
is worse than announcing nothing.

## Verify
"Does every decorative icon have `aria-hidden=\"true\"`? Are semantic icons
labeled with `aria-label` or `<title>`?"

## Patterns

Bad -- inconsistent aria-hidden:

```tsx
<svg aria-hidden="true" className="h-4 w-4">...</svg>
<svg aria-hidden="true" className="h-4 w-4">...</svg>
<ShieldAlert className="h-3.5 w-3.5 text-sky-500" />  {/* missing! */}
```

Good -- consistent:

```tsx
<svg aria-hidden="true" className="h-4 w-4">...</svg>
<svg aria-hidden="true" className="h-4 w-4">...</svg>
<ShieldAlert className="h-3.5 w-3.5 text-sky-500" aria-hidden="true" />
```
