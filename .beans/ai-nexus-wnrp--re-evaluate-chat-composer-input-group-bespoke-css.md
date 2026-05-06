---
# ai-nexus-wnrp
title: Re-evaluate chat-composer-input-group bespoke CSS class
status: todo
type: task
priority: normal
created_at: 2026-05-06T12:55:00Z
updated_at: 2026-05-06T12:55:00Z
parent: ai-nexus-9kov
---

`globals.css` currently has a bespoke `.chat-composer-input-group` rule (and a sibling `.chat-composer-dropdown-menu` rule) that exists because the InputGroup primitive's API didn't expose enough hooks to set the surface bg / border / shadow without a custom class. That's a smell about the primitive, not a real surface token.

Once the rebuilt theming system lands, evaluate:

- Can the InputGroup primitive (in `frontend/components/ui/input-group.tsx`) accept a `surface` or `tone` prop that picks from the new semantic surface vocabulary? Then the chat composer just passes `surface="raised"` instead of needing a custom CSS class.
- Same question for the model-picker dropdown (`.chat-composer-dropdown-menu`).

Goal: zero one-off CSS classes for chat surfaces. Everything goes through the surface token system.

## TODO
- [ ] Audit which one-off classes exist (`grep '\.chat-' app/globals.css` etc.)
- [ ] For each, decide: extend primitive prop / refactor consumer / accept the bespoke rule
- [ ] Delete the bespoke rules that are no longer needed
