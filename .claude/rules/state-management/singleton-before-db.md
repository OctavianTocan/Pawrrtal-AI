---
name: singleton-before-db
paths: ["**/*.ts", "**/*.tsx"]
---
# Update In-Memory State Before DB Writes

When you have both an in-memory state holder (singleton, Zustand store) and
a persistent store (DB, localStorage) with observers, always update the
in-memory source first. If DB is written first, observers fire and see new
DB state while in-memory state is still stale, causing incorrect diagnostics,
duplicate actions, or state resets.

## Verify

"Am I writing to a persistent store before updating in-memory state? Could
an observer see inconsistent state between them?"

## Patterns

Bad — DB observer fires before singleton knows:

```kotlin
meetingDao.safeInsertSession(entity)           // DB first
UnifiedRecordingState.onRecordingStarting(...) // Singleton second
// Observer sees recording in DB but singleton says idle — resets to idle!
```

Good — singleton is authoritative, updated first:

```kotlin
UnifiedRecordingState.onRecordingStarting(uuid, source) // Singleton first
meetingDao.safeInsertSession(entity)                     // DB second
// Observer fires and singleton already agrees
```
