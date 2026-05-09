---
# pawrrtal-iv88
title: Sidebar polish + chat bubble shape + flag glyph fix
status: completed
type: feature
priority: high
created_at: 2026-05-04T20:57:52Z
updated_at: 2026-05-04T21:02:30Z
---

Tightening pass for the sidebar profile button and chat row visuals.

## Todo
- [x] Toaster: top-center
- [x] NavUser separator above
- [x] NavUser trigger hover bumped + padding tightened
- [x] Dropdown items: hover bumped from /[0.03] to /[0.07], radius 4→6
- [x] Bubble: tail radius now matches main → symmetric pill
- [x] ChainOfThought paragraph → text-base (16px)
- [x] Sidebar chat title → text-[14px]
- [x] Unread glyph (the indicator user called 'flag') moved to LEFT of title

## Summary of Changes\n\n- Toaster repositioned to top-center.\n- NavUser footer: top-border separator, tightened wrapper padding, hover bumped (), aria-expanded bumped ().\n- Dropdown menu items: hover/focus bumped from  to , corner radius 4→6 for a softer fill.\n- Chat user bubble: `--radius-bubble-tail` now matches `--radius-bubble` (1.25rem) → symmetric pill silhouette.\n- ChainOfThought ThinkingStep paragraphs upgraded from text-sm (14px) to text-base (16px).\n- Sidebar chat row title bumped from text-[13px] to text-[14px].\n- Unread glyph moved out of the trailing area into a left-of-title pre-slot so it pushes the title rightward (matches reference).

## Summary of Changes

- Toaster repositioned to top-center.
- NavUser footer: top-border separator, tightened wrapper padding, hover bumped to foreground/0.07, aria-expanded to foreground/0.09.
- Dropdown menu items: hover/focus bumped from foreground/0.03 to foreground/0.07, corner radius 4→6 for a softer fill.
- Chat user bubble: --radius-bubble-tail now matches --radius-bubble (1.25rem) → symmetric pill silhouette.
- ChainOfThought ThinkingStep paragraphs upgraded from text-sm (14px) to text-base (16px).
- Sidebar chat row title bumped from text-[13px] to text-[14px].
- Unread glyph moved out of the trailing area into a left-of-title slot so it pushes the title rightward (matches reference).
