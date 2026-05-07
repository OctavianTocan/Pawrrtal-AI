---
# ai-nexus-f58v
title: 'Onboarding: load Telegram connect state with skeleton + DESIGN.md async-load pattern'
status: todo
type: feature
priority: normal
created_at: 2026-05-07T16:19:01Z
updated_at: 2026-05-07T16:19:01Z
---

## Two pieces

### 1. The bug

In the v2 onboarding "Connect Messaging" step, the Telegram row doesn't reflect the user's actual binding state at first paint. We're not loading whether they already have a ``channel_bindings`` row for ``provider='telegram'`` — so a returning user goes through the connect flow again unnecessarily.

The hook ``useTelegramBinding`` already polls ``GET /api/v1/channels``; we just don't show a loading state, and the chip doesn't switch to "Connected" until polling lands. During that window the row reads as "not connected", which is wrong for already-connected users.

#### Fix

- On step mount, call the binding query immediately (we already do this in the hook).
- While the first ``listChannels`` call is in flight, render a small skeleton/loader on the Telegram row (and any other channel rows we'll later have a binding query for).
- When the response lands, switch state to ``connected: true`` if there's a row, otherwise show the regular CTA.
- The dialog already handles the connected state — the regression is in the **chip on the step list**, not the dialog itself.

### 2. The pattern

DESIGN.md needs an **async-load convention** entry under Components → Async/Network UI: every UI surface that needs to fetch data on mount renders a skeleton or loader during the fetch, never a blank state that flickers into the real data, never the empty state until the fetch is confirmed empty. Cite this rule from the messaging-step bug as the motivating example.

## Acceptance

- Returning user opens the messaging step → Telegram row shows a tiny skeleton briefly → renders as "Connected".
- New user → skeleton briefly → renders as "Connect" CTA.
- DESIGN.md has a section under Components covering the async-load skeleton convention with one good example and one bad one.
- ``bun run design:lint`` still passes.

## Todos

- [ ] Read ``frontend/features/onboarding/v2/step-messaging.tsx`` and the binding hook
- [ ] Add a ``loading`` flag to ``useTelegramBinding`` covering the first ``refresh()`` call
- [ ] Render a skeleton on the row while loading
- [ ] Update DESIGN.md → Components → add Async Loading Pattern entry
- [ ] Run ``bun run design:lint``
