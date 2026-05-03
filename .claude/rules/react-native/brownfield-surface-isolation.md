---
name: brownfield-surface-isolation
paths: ["**/*.{ts,tsx,kt,java,swift}"]
---

# Isolate Each Brownfield Surface With Its Own Error Boundary and Provider Tree

Each brownfield surface must have its own error boundary and provider tree. Surfaces are independent entry points that can't share React context.

## Rule

In a brownfield app, each registered surface (e.g., digest, chat, transcribe) mounts as an independent React root. They don't share context, state, or error boundaries. Each surface needs:

1. Its own `ErrorBoundary` wrapping
2. Its own provider stack (auth, config, theme)
3. Independent error recovery (one surface crashing shouldn't affect others)

## Why

A crash in the chat surface shouldn't take down the transcription surface. In a brownfield setup, the native host app expects each surface to be self-contained. Sharing providers across surfaces creates invisible coupling where one surface's state mutation can break another.

## Verify

"Does each brownfield surface have its own `ErrorBoundary` and full provider stack? Could one surface crash without affecting any other surface?"

## Patterns

Bad — surfaces sharing a single provider tree:

```tsx
// App root — shared providers leak state between surfaces
function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <ChatSurface />
        <TranscribeSurface />
      </ThemeProvider>
    </AuthProvider>
  );
}
```

Good — each surface wraps itself independently:

```tsx
// chat/index.tsx — self-contained entry point
export function ChatSurface() {
  return (
    <ErrorBoundary fallback={ChatErrorScreen}>
      <AuthProvider>
        <ThemeProvider>
          <ChatApp />
        </ThemeProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

// transcribe/index.tsx — completely independent
export function TranscribeSurface() {
  return (
    <ErrorBoundary fallback={TranscribeErrorScreen}>
      <AuthProvider>
        <ThemeProvider>
          <TranscribeApp />
        </ThemeProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
```
