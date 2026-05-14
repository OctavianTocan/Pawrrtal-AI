---
# pawrrtal-wqhj
title: 'Sidebar collapsed: New Session becomes icon-only in top bar'
status: completed
type: feature
priority: normal
created_at: 2026-05-07T16:19:53Z
updated_at: 2026-05-09T12:14:20Z
---

## Goal

When the sidebar is collapsed/hidden, the "New Session" CTA currently disappears entirely — there's no way to start a new chat without re-opening the sidebar. Move it: when the sidebar is collapsed, the New Session button renders as an icon-only button in the top bar, immediately to the right of the workspace selector.

## Acceptance

- Sidebar expanded → New Session lives in the sidebar with full label (current behaviour).
- Sidebar collapsed → New Session renders as an icon-only button in the top bar, right of the workspace selector.
- Clicking the icon-only version triggers the same dropdown menu (it's currently a ``DropdownContextMenuTrigger`` per the user's React trail).
- Tooltip on hover when icon-only ("New session" / matches the menu trigger label).
- DESIGN.md spec for top-bar buttons covers the icon size + spacing — if not, add it.

## Where to look

- The button shown in the user feedback: ``<Primitive.button> ... <DropdownContextMenuTrigger> <Slot> <Button> button [New Session]``, DOM ``.flex > .gap-2 > .relative > .group/button``.
- Sidebar collapsed state lives in ``frontend/features/...`` — the existing ``pawrrtal-xkqf`` "Sidebar slide animation" bean is the closest neighbour.
- Top bar component is in ``frontend/components/app-layout.tsx`` (already flagged for splitting in another bean).

## Todos

- [ ] Read the New Session button + its dropdown
- [ ] Add an icon-only variant gated on the sidebar collapsed state
- [ ] Position it in the top bar after the workspace selector
- [ ] Tooltip + aria-label on the icon-only variant
- [ ] Verify behaviour on cold load + sidebar toggle
- [ ] DESIGN.md update for top-bar button slots if not already covered



## Scope (2026-05-09)
Addressing Agentation / feedback batch: submit sizing, Telegram load in onboarding messaging, collapsed-header New Session, permissions contrast, keyboard shortcuts modal, voice meter waveform, StepIdentity tokens, quick-prompt cursors, provider submenu selected state.



## Summary of Changes (2026-05-09)
- Submit / InputGroup: forward compact sizes to `Button` so toolbar submit matches mic row height.
- Collapsed sidebar: `NewSessionButton` `headerCompact` variant beside workspace selector in `AppHeader`.
- Help menu: Keyboard Shortcuts opens `KeyboardShortcutsDialog` modal.
- Onboarding messaging: `listChannels` snapshot + Telegram row spinner; refetch after dialog closes; DESIGN.md `deferred-fetch-on-surface-open`.
- Default permissions: `text-foreground` + optional `text-info` icon on trigger.
- Voice meter: Web Audio RMS + right-anchored waveform strip; `voice-analyser-meter.ts` helper.
- Model / safety menus: selected row background instead of trailing checkmarks.
- Prompt suggestions + inputs: `cursor-pointer`, `text-foreground` on `Input`.
