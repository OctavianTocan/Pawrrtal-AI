---
name: zustand-setter-stable-ref
paths: ["**/*.{ts,tsx}"]
---
# Zustand Setters Are Stable Refs

Zustand store setter functions (from `useStore(s => s.setX)`) are stable
references that never change between renders. Including them in dependency
arrays is unnecessary and, in specific React versions and environments like
Chrome extensions, has been observed to trigger infinite re-render loops.
Treat them like `dispatch` from useReducer: always stable, never a dependency.

## Verify

"Am I including a Zustand setter or similar stable function in a dependency
array? Could it cause unnecessary re-executions?"

## Patterns

Bad — stable setter in deps causes infinite loop:

```typescript
const setUser = useStore(s => s.setUser);
const fetchUser = useCallback(async () => {
  const user = await api.getUser();
  setUser(user);
}, [setUser]); // Unnecessary, can loop
useEffect(() => { fetchUser(); }, [fetchUser]);
```

Good — intentionally omit stable setters:

```typescript
const setUser = useStore(s => s.setUser);
const fetchUser = useCallback(async () => {
  const user = await api.getUser();
  setUser(user);
}, []); // setUser is stable — safe to omit
useEffect(() => { fetchUser(); }, []);
```
