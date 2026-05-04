---
name: use-factory-functions-for-login-strategies
paths: ["**/*.{ts,tsx}"]
---
# Use Factory Functions for Login Strategies, Not Hooks - Hooks Are Untestable and Block on Expensive Finalization

Use factory functions for login strategies instead of hooks. A factory like
`createGoogleLogin(setUser, setLoading)` is testable in isolation without
rendering a component. Keep blocking auth fast; expensive finalization
(calendar sync, profile fetch) should be fire-and-forget.

## Verify

"Is this login strategy testable without rendering a component? Is the
critical path fast, with expensive work deferred?"

## Patterns

Bad — login strategy buried in a hook, hard to test:

```typescript
function useGoogleLogin() {
  const [loading, setLoading] = useState(false);
  const login = async () => {
    setLoading(true);
    const cred = await signInWithPopup(auth, googleProvider);
    await syncCalendar(cred); // Blocks login for 3s
    setLoading(false);
  };
  return { login, loading };
}
```

Good — factory is testable, expensive work is deferred:

```typescript
function createGoogleLogin(setUser: SetUser, setLoading: SetLoading) {
  return async () => {
    setLoading(true);
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      setUser(cred.user);
      void syncCalendar(cred); // Fire-and-forget
    } finally {
      setLoading(false);
    }
  };
}
```
