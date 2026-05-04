---
name: window-polyfill-guard
paths: ["**/*.{ts,tsx}"]
---
# Guard window.addEventListener in React Native

On React Native (Hermes runtime), `window` exists as a polyfill but
`window.addEventListener` may not be a function. Check both before
registering event listeners.

## Verify

"Does this code assume window.addEventListener exists? Could it run in
React Native?"

## Patterns

Bad — crashes on Hermes:

```typescript
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', cleanup);
}
```

Good — checks both window and addEventListener:

```typescript
if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
  window.addEventListener('beforeunload', cleanup);
}
```
