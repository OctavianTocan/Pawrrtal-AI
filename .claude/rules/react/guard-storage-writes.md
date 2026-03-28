# Guard Storage Writes

Always wrap `localStorage.setItem` and `sessionStorage.setItem` in
try/catch. Storage writes can throw on quota exceeded, private browsing
restrictions, or blocked storage access. If the read side is already
guarded with try/catch, the write side must be too -- an unguarded
`setItem` will crash the component when storage is unavailable.

## Verify
"Is every `localStorage.setItem` and `sessionStorage.setItem` call
wrapped in try/catch? Are both reads and writes consistently guarded?"

## Patterns

Bad -- write throws in private browsing:

```tsx
function savePreference(key: string, value: string): void {
  localStorage.setItem(key, value);
}
```

Good -- write is guarded:

```tsx
function savePreference(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Storage unavailable (quota exceeded, private browsing, blocked)
  }
}
```
