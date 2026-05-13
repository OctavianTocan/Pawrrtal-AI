---
# pawrrtal-rovs
title: 'Chat: tune typography for reasoning, chain-of-thought, and tool steps'
status: todo
type: feature
priority: normal
tags:
    - chat
    - typography
    - design-system
created_at: 2026-05-13T21:05:45Z
updated_at: 2026-05-13T21:05:45Z
---

## Problem

Font sizes in the chat UI are not consistently correct for auxiliary content: reasoning blocks, chain-of-thought, and tool call / tool result presentation. Hierarchy and readability should match `DESIGN.md` / globals (Craft Agents-inspired scale) rather than feeling too large, too small, or mixed.

## Scope

- Reasoning panels and streaming “thinking” copy
- Tool step rows (calls, statuses, summaries) adjacent to assistant messages

## Acceptance criteria ideas

- [ ] Audit current classes in reasoning/tool components (`AssistantMessage`, `ChainOfThought`, related tool UI) against design tokens.
- [ ] Align type scale with the rest of the chat transcript (assistant vs user baseline) — no stray larger/smaller jumps without intent.
- [ ] Verify in desktop and compact widths; meets contrast and scanability targets.
- [ ] Optional: capture before/after in `DESIGN.md` if we establish a repeatable pattern for “secondary transcript” typography.

## Notes

Separate from tooling bugs (see Exa tooling bean); purely visual/readability typography work unless discovery finds token gaps.
