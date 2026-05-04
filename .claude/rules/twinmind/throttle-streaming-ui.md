---
name: throttle-streaming-ui
paths: ["**/*.{ts,tsx,kt,swift}"]
---

# Throttle Streaming UI Updates

Streaming UI updates must be throttled to ≥500ms intervals. Buffer small chunks before committing state mutations.

## Rule

SSE and WebSocket streams can emit tokens at 10-50ms intervals. Calling setState on every token causes React to re-render the entire component tree at 20-100fps, dropping frames and making the UI unusable. Buffer incoming tokens and flush to state on a requestAnimationFrame or 500ms timer.

## Bad

```typescript
eventSource.onmessage = (event) => {
  setTranscript(prev => prev + event.data); // 50 re-renders per second
};
```

## Good

```typescript
const bufferRef = useRef('');
const rafRef = useRef<number>();

eventSource.onmessage = (event) => {
  bufferRef.current += event.data;
  if (!rafRef.current) {
    rafRef.current = requestAnimationFrame(() => {
      setTranscript(prev => prev + bufferRef.current);
      bufferRef.current = '';
      rafRef.current = undefined;
    });
  }
};
```

## Why

Live transcription caused the meeting page to become unresponsive. The transcript component re-rendered on every SSE token (~30ms), creating a backlog of React renders that froze the UI.

## Verify

- Use React DevTools Profiler to confirm re-render count matches expected batching (1 per 500ms, not 1 per token)
- Verify transcript updates smoothly during fast speech without frame drops
- Verify backpressure doesn't cause tokens to be dropped or delayed excessively
- Test with simulated high-frequency tokens (10ms intervals) and confirm UI stays responsive

## Patterns

- **requestAnimationFrame batching:** Buffer tokens and flush on next animation frame
- **Debounce/throttle timer:** Flush buffered content on 500ms interval
- **Virtual list for long transcripts:** Only render visible portion, buffer the rest
