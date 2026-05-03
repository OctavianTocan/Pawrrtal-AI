---
name: heartbeat-over-ondestroy
paths: ["**/*.{ts,tsx,kt,swift}"]
---

# Heartbeat Over onDestroy

Persistent state cleanup must use a heartbeat/watchdog pattern, not lifecycle callbacks. onDestroy, componentWillUnmount, and process exit handlers are unreliable on force-kill.

## Rule

When your app writes persistent state (recording in progress, meeting active, sync pending), don't rely on cleanup callbacks to clear it. Use a heartbeat: write a timestamp periodically, and treat entries older than 2× the heartbeat interval as stale.

## Bad

```kotlin
// Android: onDestroy isn't called on force-kill
override fun onDestroy() {
  database.setRecordingActive(false) // never runs if process killed
  super.onDestroy()
}
```

## Good

```typescript
// Write heartbeat every 30s while recording
const HEARTBEAT_INTERVAL = 30_000;
const STALE_THRESHOLD = 60_000;

setInterval(() => {
  db.setRecordingHeartbeat(Date.now());
}, HEARTBEAT_INTERVAL);

// On next app launch, check for stale recordings
const lastHeartbeat = db.getRecordingHeartbeat();
if (Date.now() - lastHeartbeat > STALE_THRESHOLD) {
  db.clearStaleRecording(); // orphaned recording, clean up
}
```

## Why

Android kills background processes without calling onDestroy. iOS terminates suspended apps silently. A user force-killing the app during recording leaves a "recording active" flag in the database that blocks future recordings until the app data is cleared.

## Verify

Test orphaned state by:

1. Start a recording
2. Force-kill the app (swipe away on iOS, "Force Stop" on Android)
3. Reopen the app
4. Verify the app detects the stale state and cleans up

## Patterns

- **Stale Detection**: On app launch, query all persistent state entries and check if their heartbeat is older than 2× the interval
- **Grace Period**: Use 2× to 3× the heartbeat interval as the stale threshold to avoid false positives
- **Periodic Sweep**: Run cleanup on app foreground, not just launch
- **State + Heartbeat**: Store both state (recording=true) and heartbeat (timestamp) — don't rely on heartbeat alone for state truth
