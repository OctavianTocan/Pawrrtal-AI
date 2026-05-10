---
# pawrrtal-2ylw
title: Chat composer Submit button is bigger than peers
status: todo
type: bug
priority: normal
created_at: 2026-05-07T16:19:39Z
updated_at: 2026-05-07T16:19:39Z
---

## Symptom

In the chat composer toolbar (``frontend/features/chat/components/...`` — chat composer / PromptInputSubmit), the Submit button visually outsizes the row of peer controls (mic, model selector, etc). The composer row should have all controls at the same target size.

User flagged it from two viewports (1800×1037 and 1800×950) so it's not a responsive-only quirk.

## React tree

``<Primitive.button> <Primitive.button.Slot> <Primitive.button.SlotClone> <PromptInputSubmit> <InputGroupButton> <Button> button [Submit]``

DOM trail: ``.flex > .ml-auto > .inline-flex > .group/button``.

## Likely cause

``PromptInputSubmit`` defaults to ``size="default"`` or larger; peers use ``size="sm"`` / ``size="icon"``. Confirm by reading the PromptInputSubmit component and the wrapper in our chat composer.

## Fix

- Match the rest of the composer's button sizes (``size="icon"`` if peers are icon-only, ``size="sm"`` otherwise).
- Verify alignment via DESIGN.md → Composer Bar (or equivalent) — if no token exists for "composer button size" make one rather than spot-fixing.

## Acceptance

- All composer-row buttons have the same height + same horizontal rhythm.
- Pixel-diff against Figma if a frame exists; otherwise compare against the model selector & mic buttons.
- Both 1800×1037 and 1800×950 viewports look right.

## Todos

- [ ] Read ``PromptInputSubmit`` and the chat composer wrapper
- [ ] Identify the offending size token / default
- [ ] Fix at the composer-wrapper layer (don't change the primitive)
- [ ] Verify on both viewports
- [ ] If a token doesn't exist, add one to DESIGN.md → Components → Chat Composer
