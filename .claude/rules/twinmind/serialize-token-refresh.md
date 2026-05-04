---
name: serialize-token-refresh
paths: ["**/*.{ts,tsx,kt,swift}"]
---

# Concurrent 401s Must Share a Single Token Refresh Coordinator

Concurrent 401s must go through a single coordinator (actor, mutex, or cached promise). Never let individual requests trigger token refresh independently.

## Rule

When multiple API requests hit 401 simultaneously, they should all wait on a single refresh attempt. Five concurrent 401s should produce one token refresh, not five.

## Bad

```typescript
async function fetchWithAuth(url: string) {
  const res = await fetch(url, { headers: authHeaders() });
  if (res.status === 401) {
    await refreshToken(); // each caller refreshes independently
    return fetch(url, { headers: authHeaders() });
  }
  return res;
}
```

## Good

```typescript
let refreshPromise: Promise<void> | null = null;

async function fetchWithAuth(url: string) {
  const res = await fetch(url, { headers: authHeaders() });
  if (res.status === 401) {
    if (!refreshPromise) {
      refreshPromise = refreshToken().finally(() => {
        refreshPromise = null;
      });
    }
    await refreshPromise;
    return fetch(url, { headers: authHeaders() });
  }
  return res;
}
```

## Why

Parallel refresh calls cause token invalidation races. The second refresh may invalidate the token the first refresh just obtained, creating an infinite 401 loop.

## Verify

- Fire 5 concurrent requests that all return 401, verify only 1 token refresh occurs
- Verify all 5 requests retry with the new token after refresh completes
- Verify no infinite 401 loops occur under race conditions
- Verify refresh failure (network error) is handled gracefully and propagates to all waiters

## Patterns

- **Cached promise pattern:** Store the in-flight refresh promise and return it to subsequent callers
- **Actor/mutex pattern:** Use a synchronization primitive to serialize refresh attempts
- **Lazy initialization:** Create the coordinator on first 401, not at module load
