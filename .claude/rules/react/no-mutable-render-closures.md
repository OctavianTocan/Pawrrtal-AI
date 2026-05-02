---
description: "Avoid mutable closures inside JSX render paths"
globs: ["frontend/**/*.tsx"]
---

# No Mutable Closures in Render

React StrictMode double-invokes render functions in development. Mutable variables
(`let` counters, `push` accumulators) inside a render produce wrong values on the
second pass and correct values in production — a hidden, hard-to-catch bug.

## Rule

Pre-compute derived values (flat indices, running counters, aggregated arrays)
**before** the JSX `return`, then reference them from the JSX purely via lookup
(`Map.get`, array index).

### Bad

```tsx
function List({ items }) {
  let i = -1;
  return items.map((item) => {
    i += 1; // ← mutated during render
    return <Row key={item.id} index={i} />;
  });
}
```

### Good

```tsx
function List({ items }) {
  const indexMap = new Map(items.map((item, i) => [item.id, i]));
  return items.map((item) => (
    <Row key={item.id} index={indexMap.get(item.id) ?? 0} />
  ));
}
```

## Why

React.StrictMode calls render twice (dev only) to surface impure renders. A `let`
counter increments twice per item, so every index after the first is wrong in dev
but fine in production. The resulting UI glitch is nearly impossible to reproduce
in a production build.
