---
# ai-nexus-w4xx
title: Restore dark-mode toggle without bringing back the appearance system
status: todo
type: bug
priority: high
created_at: 2026-05-06T12:54:42Z
updated_at: 2026-05-06T12:54:42Z
parent: ai-nexus-9kov
---

The deleted `AppearanceProvider` was responsible for adding/removing the `.dark` class on `<html>` based on the user's resolved theme mode (light / dark / system). With the provider gone, `.dark` is never set and the app is stuck in light mode.

This needs a tiny replacement that:

1. Reads OS preference via `window.matchMedia('(prefers-color-scheme: dark)')`.
2. Applies / removes `.dark` on `<html>` accordingly.
3. Optionally persists a user choice (`light` / `dark` / `system`) in localStorage via `usePersistedState` (`frontend/hooks/use-persisted-state.ts`).

Should NOT mount any react-query provider, NOT hit any API, NOT inject any CSS variables — just toggle the `.dark` class.

Probably belongs as a small standalone component or a layout-level effect in `frontend/app/layout.tsx`. Coordinate with whatever the rebuilt theming system decides about modes.

## TODO
- [ ] Implement minimal mode toggle
- [ ] Wire to Settings → Appearance → Theme card so the visual mock actually changes the active mode (mock UI gets some real behavior back)
- [ ] Verify both system-pref-changes and explicit user choice work
