---
name: expo-web-for-fast-iteration
paths: ["**/*.{ts,tsx,js,jsx}", "app.json", "app.config.*"]
---
# Use expo start --web for Fast Visual Iteration

`expo start --web` launches the app in a browser using webpack/metro web bundler with V8. Hot reload is near-instant, and you get Chrome DevTools for debugging. This catches most logic bugs, layout issues, and state management problems without waiting for a Simulator build.

Save `expo run:ios` (or `expo run:android`) for testing Hermes-specific behavior, native module integration, and platform-specific APIs. A Simulator rebuild takes 30-120 seconds; a web refresh takes <1 second. During active development of UI and business logic, the 100x faster feedback loop of web mode is worth the tradeoff of missing native-specific edge cases.

The exceptions: test on native when using Animated, native gestures, TurboModules, or any API that doesn't have a web polyfill.

## Verify

"Can I iterate on this change using expo web, or does it require native APIs that only work on iOS/Android?"

## Patterns

Bad — rebuilding on Simulator for every UI change:

```bash
# Every change requires a 30-120 second rebuild
expo run:ios
# Make a padding change...
# Wait 30s for Metro + native rebuild
# Make another padding change...
# Wait 30s again
```

Good — iterate on web, validate on native:

```bash
# Fast iteration loop (sub-second refresh)
expo start --web
# Iterate on layout, state, business logic...
# When ready, validate on native
expo run:ios
# Test native-specific behavior: animations, gestures, haptics
```

Good — know what requires native testing:

```typescript
// ✅ Safe to develop on web
// - Layout and styling (flexbox works identically)
// - State management (Zustand, context, reducers)
// - API calls and data fetching
// - Navigation structure (expo-router works on web)

// ⚠️ Must test on native
// - Reanimated worklet animations
// - Native gesture handler interactions
// - TurboModule bridges
// - Platform.select() branches
// - Hermes-specific JS engine behavior
```
