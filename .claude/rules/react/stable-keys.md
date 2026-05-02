---
description: "Use stable, content-derived keys instead of array indices"
globs: ["frontend/**/*.tsx"]
---

# Stable React Keys

Array-index keys cause React to re-mount components when items are reordered,
inserted, or removed — producing stale state, broken animations, and lost focus.

## Rule

Use a stable identifier from the item data:

- `id` field (preferred)
- `name` or `slug` when `id` is absent
- A deterministic composite key (`${parentId}-${childName}`)

### Bad

```tsx
labels.map((label, i) => <Badge key={i} label={label} />)
```

### Good

```tsx
labels.map((label) => {
  const key = typeof label === 'string' ? label : (label.id ?? label.name);
  return <Badge key={key} label={label} />;
})
```

## When Index Keys Are Acceptable

Only when **all three** conditions are true:

1. The list is static (never reordered, filtered, or appended).
2. Items have no state or refs.
3. Items have no stable unique identifier.

When in doubt, use a content-derived key.
