---
name: zustand-immutable-updates
paths: ["**/*.{ts,tsx}"]
---
# Never Mutate Zustand State Directly

Zustand uses reference equality to detect changes. Direct mutation
(`state.items.push(x)` or `state.flags[k] = v`) modifies the existing object
without creating a new reference, so Zustand skips re-renders. Always spread
to create new objects and arrays in `set()` callbacks.

## Verify

"Am I mutating an existing state object inside `set()`? Am I creating new
references for changed data?"

## Patterns

Bad — mutates existing references, no re-render:

```typescript
set((state) => {
  state.items.push(newItem);
  state.flags[key] = true;
  return state; // Same reference
});
```

Good — new references trigger re-renders:

```typescript
set((state) => ({
  items: [...state.items, newItem],
  flags: { ...state.flags, [key]: true },
}));
```
