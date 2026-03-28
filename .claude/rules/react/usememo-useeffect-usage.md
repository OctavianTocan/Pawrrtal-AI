# useMemo and useEffect Usage

Only use `useMemo` and `useEffect` when they provide clear benefits. Most
React renders are fast enough without memoization. Overuse adds complexity
and makes code harder to reason about. Use this checklist to decide:

## useMemo Checklist

Use `useMemo` when ALL of these are true:

1. **Expensive computation**: The calculation is O(n log n) or worse, OR processes large arrays/objects
2. **Referential stability matters**: The result is used as a dependency in other hooks, OR passed to memoized child components
3. **Runs frequently**: The component re-renders often with the same inputs

DON'T use `useMemo` for:
- Simple arithmetic or string operations
- Array.map/filter on small arrays (<100 items)
- Object literals or simple transformations
- Values that change on every render anyway

## useEffect Checklist

Use `useEffect` when the code:

1. **Performs side effects**: localStorage, network requests, subscriptions, timers, DOM manipulation
2. **Synchronizes with external systems**: Browser APIs, third-party libraries, global state
3. **Can't run during render**: The effect must happen AFTER the DOM updates

DON'T use `useEffect` for:
- Computing derived state (use `useMemo` or direct computation instead)
- Event handlers (use onClick, onChange, etc. instead)
- Initializing state (use `useState` with initializer function instead)
- Formatting/transforming data (do it during render)

## Verify

"Is this useMemo/useEffect justified by the checklists above? Could this be
a plain variable or event handler instead? Does the added complexity pay off?"

## Patterns

Bad -- unnecessary useMemo/useEffect:

```tsx
// This is cheap, no memoization needed
const doubledCount = useMemo(() => count * 2, [count]);

// This should be an event handler, not an effect
useEffect(() => {
  if (isSubmitted) {
    handleSubmit();
  }
}, [isSubmitted]);

// This should be computed during render
const [filteredItems, setFilteredItems] = useState([]);
useEffect(() => {
  setFilteredItems(items.filter(i => i.active));
}, [items]);
```

Good -- justified useMemo/useEffect:

```tsx
// useMemo justified: O(n log n) sort + filter is expensive, runs on every render
const sortedAndFiltered = useMemo(
  () => items.filter(i => i.active).sort((a, b) => a.name.localeCompare(b.name)),
  [items]
);

// useEffect justified: synchronizing React state with localStorage (side effect)
useEffect(() => {
  try {
    localStorage.setItem('collapsed-groups', JSON.stringify(collapsedGroups));
  } catch {
    // Quota exceeded
  }
}, [collapsedGroups]);

// Direct computation: cheap operation, no memoization needed
const doubledCount = count * 2;

// Event handler: user action triggers the effect, not state change
const handleButtonClick = () => {
  if (isValid) {
    handleSubmit();
  }
};
```

## Documenting Justified Hooks

When you DO use `useMemo` or `useEffect`, add a comment explaining WHY:

```tsx
// useMemo justified: buildConversationGroups sorts and groups conversations,
// which is O(n log n). We memoize to avoid recomputing on every render.
const groups = useMemo(() => buildConversationGroups(conversations), [conversations]);

// useEffect justified: We need to synchronize collapsedGroups state with
// localStorage whenever it changes. This is a side effect that can't be
// done during render.
useEffect(() => {
  // ...
}, [collapsedGroups]);
```

## Notes

- When in doubt, start without memoization. Add it only if profiling shows a performance issue.
- Remember: premature optimization is the root of all evil.
- React is already fast. Trust it until proven otherwise.
