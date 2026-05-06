---
# ai-nexus-jayl
title: Fix usePersistedState getSnapshot cache (infinite-loop warning)
status: completed
type: bug
created_at: 2026-05-06T13:45:16Z
updated_at: 2026-05-06T13:45:16Z
---

useSyncExternalStore warned 'getSnapshot should be cached' because readPersistedValue JSON.parsed on every call, returning a fresh object reference for object/array values. Added a module-level cache keyed by raw localStorage string so repeated reads with unchanged storage return a stable reference. Triggered by useWhimsyConfig/useWhimsyTile but the bug existed for any object value.
