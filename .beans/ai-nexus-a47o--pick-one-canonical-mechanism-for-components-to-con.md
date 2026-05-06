---
# ai-nexus-a47o
title: Pick one canonical mechanism for components to consume surface tokens
status: todo
type: task
priority: normal
created_at: 2026-05-06T12:54:26Z
updated_at: 2026-05-06T12:54:26Z
parent: ai-nexus-9kov
---

At the moment of the rip, components used FOUR parallel mechanisms to set a surface color:

1. Tailwind utility from `@theme` — `bg-sidebar`, `bg-foreground-5`. Most common.
2. Tailwind arbitrary value — `bg-[color:var(--background-elevated)]`. Used in chat composer.
3. Inline `style` — `style={{ backgroundColor: 'var(--background-elevated)' }}`. Used in ChatView.
4. Bespoke CSS class — `.chat-composer-input-group` etc. in globals.css.

All four were technically valid. None was documented as canonical.

## Decision

Pick one (Tailwind utility from `@theme` is my prior). Migrate the three holdout patterns:

- Inline-style holdouts → migrate once the Tailwind utility exists.
- Bespoke CSS class holdouts → either fold into `@theme` or remove the one-off in favour of better primitive APIs.
- Arbitrary-value holdouts → typically a sign the Tailwind utility doesn't exist yet; add it via the surface-token manifest.

## TODO
- [ ] Pick the canonical mechanism
- [ ] Migrate inline-style holdouts (currently: ChatView panel)
- [ ] Migrate arbitrary-value holdouts (currently: ChatComposer input group)
- [ ] Migrate / kill bespoke CSS classes (currently: `chat-composer-input-group`, `chat-composer-dropdown-menu`)
