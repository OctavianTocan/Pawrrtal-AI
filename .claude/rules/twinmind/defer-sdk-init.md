---
name: defer-sdk-init
paths: ["**/*.{ts,tsx,kt,swift}"]
---

# Defer SDK Initialization

Analytics/engagement SDKs must initialize after the critical user path completes. Never init eagerly at module scope or app startup.

## Rule

Third-party SDKs (analytics, engagement, crash reporting) should lazy-load after the first meaningful paint or user interaction. Eager initialization blocks the main thread and can break critical flows.

## Bad

```typescript
// app/layout.tsx — blocks initial render
import { WebEngage } from 'webengage';
WebEngage.init('API_KEY');
```

## Good

```typescript
// Initialize after first user interaction or idle callback
useEffect(() => {
  requestIdleCallback(() => {
    import('webengage').then(({ WebEngage }) => {
      WebEngage.init('API_KEY');
    });
  });
}, []);
```

## Why

Eager SDK init broke a checkout flow when the SDK's network requests competed with Stripe's payment confirmation, causing timeouts on slow connections. Moving to deferred init fixed it.

## Verify

Measure initial load time before and after SDK changes. SDK init should add <50ms to Time to Interactive. Use:

- Lighthouse / WebPageTest for web
- INSTRUMENTS Time Profiler for iOS
- Android Profiler for Android

## Patterns

- **Lazy Import**: Use dynamic `import()` or `lazy` module loading
- **Feature Flags**: Gate SDK init behind flags to disable in critical flows
- **Connection Check**: Initialize non-critical SDKs only when network is idle (no active requests)
- **SDK Sandwich**: If SDK must init early, wrap it: lock UI thread → init SDK → release UI thread
