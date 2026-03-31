---
description: When making state-changing network requests (POST/PUT/PATCH/DELETE), always use TanStack React Query mutations instead of raw fetch calls inside components.
globs: ["frontend/**/*.{ts,tsx}"]
tags: [react, data-fetching, architecture]
---

# Use React Query Mutations

Always use `@tanstack/react-query`'s `useMutation` hook for state-changing network requests (like form submissions, deletes, or updates) instead of raw `fetch` calls with `try/catch/finally` inside components.

## Scope
Raw `fetch` is permitted inside custom hooks, non-state-changing GETs, Server Components, and shared API clients. The goal is to keep components focused on presentation, not mutation boilerplate.

## Why
- **Automatic Lifecycle State:** `useMutation` provides `isPending`, `isSuccess`, and `error` states automatically, preventing you from having to manually juggle `setIsLoading(true/false)` and `setErrorMessage(...)` boilerplate in your components.
- **Cache Invalidation:** Mutations cleanly hook into the React Query cache via `onSuccess: () => queryClient.invalidateQueries(...)`, allowing you to seamlessly refresh related data across the app after a successful write.
- **Separation of Concerns:** It keeps network fetching and error-parsing logic out of the UI layer.

## Bad Pattern (Raw Fetch)
Do not manage loading and error state manually with `fetch` inside components.

```tsx
const [isLoading, setIsLoading] = useState(false);
const [error, setError] = useState('');

const submitForm = async () => {
  setIsLoading(true);
  try {
    const res = await fetch('/api/submit', { method: 'POST' });
    if (!res.ok) throw new Error('Failed');
    // Success...
  } catch (err) {
    setError('Failed to submit.');
  } finally {
    setIsLoading(false);
  }
}
```

## Good Pattern (useMutation)
Extract the fetch into a `useMutation` hook and use its built-in state variables. Use the application's shared API endpoints and fetch utilities.

**`use-submit-form.ts`:**
```ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthedFetch } from '@/hooks/useAuthedFetch';
import { API_ENDPOINTS } from '@/lib/api';

export function useSubmitForm() {
  const queryClient = useQueryClient();
  const authedFetch = useAuthedFetch();

  return useMutation({
    mutationFn: async (data: Payload) => {
      const response = await authedFetch(API_ENDPOINTS.submitForm, {
        method: 'POST',
        body: JSON.stringify(data)
      });
      if (!response.ok) {
        throw new Error('Failed to submit.');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['some-data'] });
    }
  });
}
```

**`MyComponent.tsx`:**
```tsx
const submitMutation = useSubmitForm();

const handleSubmit = async () => {
  await submitMutation.mutateAsync({ foo: 'bar' });
}

// Access state cleanly:
// submitMutation.isPending
// submitMutation.error?.message
```
