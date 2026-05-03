---
name: hermes-no-es2023-array
paths: ["**/*.{ts,tsx,js,jsx}"]
---
# Hermes Lacks ES2023 Array Methods

The default Hermes engine bundled with React Native does not support ES2023 array methods: `.toSorted()`, `.toReversed()`, `.toSpliced()`, `.findLast()`, and `.findLastIndex()`. TypeScript will happily compile these with no errors if your `lib` includes `ES2023`, but they crash at runtime with `TypeError: undefined is not a function`.

This is especially treacherous because the code works perfectly in `expo start --web` (V8/SpiderMonkey support these methods), in Node.js tests, and in any browser dev tools. The crash only surfaces on the actual React Native runtime with Hermes, often late in the development cycle.

Use spread + sort/reverse for immutable operations, and manual loop or `.slice().reverse().find()` for findLast equivalents.

## Verify

"Am I using .toSorted(), .toReversed(), .toSpliced(), .findLast(), or .findLastIndex()? If so, will this run on Hermes?"

## Patterns

Bad — ES2023 methods that crash on Hermes:

```typescript
const sorted = items.toSorted((a, b) => a.date - b.date);
const reversed = items.toReversed();
const last = items.findLast((item) => item.isActive);
```

Good — Hermes-compatible equivalents:

```typescript
const sorted = [...items].sort((a, b) => a.date - b.date);
const reversed = [...items].reverse();
const last = [...items].reverse().find((item) => item.isActive);
```

Good — efficient findLast without double reversal:

```typescript
function findLast<T>(arr: T[], predicate: (item: T) => boolean): T | undefined {
 for (let i = arr.length - 1; i >= 0; i--) {
  if (predicate(arr[i])) return arr[i];
 }
 return undefined;
}

const last = findLast(items, (item) => item.isActive);
```
