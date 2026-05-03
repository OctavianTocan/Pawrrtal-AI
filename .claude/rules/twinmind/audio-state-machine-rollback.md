---
name: audio-state-machine-rollback
paths: ["**/*.{ts,tsx,kt,swift}"]
---

# Every Audio Recording State Transition Must Rollback on Failure

Every recording state transition must have a rollback path on failure. Never set UI state optimistically without a corresponding revert.

## Rule

When transitioning recording state (idle → preparing → recording → stopping → idle), each forward step needs a `catch` or `finally` that reverts to the previous state. Optimistic UI updates without rollback create "zombie" indicators where the UI shows recording but audio isn't capturing, or shows stopped but audio is still running.

## Bad

```typescript
async function startRecording() {
  setRecordingState('recording'); // optimistic
  await audioEngine.start(); // if this throws, UI is stuck on 'recording'
}
```

## Good

```typescript
async function startRecording() {
  const previousState = recordingState;
  setRecordingState('preparing');
  try {
    await audioEngine.start();
    setRecordingState('recording');
  } catch (error) {
    setRecordingState(previousState); // rollback
    reportError(error);
  }
}
```

## Why

Audio hardware is unreliable. Bluetooth disconnects, permission revocations, and OS interrupts can fail any transition. A stuck recording indicator is worse than a failed-to-start error because the user thinks they're capturing audio when they aren't.

## Verify

Test each state transition by injecting failures:

- Mock `audioEngine.start()` to throw
- Use Airplane mode to simulate permission/network issues
- Force-kill the app mid-transition

Verify the UI returns to the previous state and no "zombie" recording indicators appear.

## Patterns

- **State Machine**: Use an explicit state machine (XState, custom) where transitions are atomic and transitions define both forward and backward paths
- **Optimistic UI with Confirmation**: Update UI only after confirming the hardware operation succeeded
- **Undo Stack**: Maintain a stack of UI states to enable multi-step rollback
