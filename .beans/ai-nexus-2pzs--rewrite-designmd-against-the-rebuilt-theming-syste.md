---
# ai-nexus-2pzs
title: Rewrite DESIGN.md against the rebuilt theming system
status: todo
type: task
priority: normal
created_at: 2026-05-06T12:54:53Z
updated_at: 2026-05-06T12:54:53Z
parent: ai-nexus-9kov
---

DESIGN.md is currently lying about the system. It documents `--sidebar = --background-elevated`, an elevation hierarchy of `background < sidebar < card < popover`, and a 1.5% foreground mix formula — none of which match the code as of the 2026-05-06 rip.

Once the rebuild has landed (semantic surface vocabulary, customization scope, canonical consumption mechanism — all sub-beans), rewrite DESIGN.md to:

1. Document the surface vocabulary and what each surface is for.
2. Document the derivation formula (or lack thereof — if surfaces are explicit literals).
3. Document the canonical component-consumption mechanism.
4. Document the customization scope (what users can edit, what they can't).
5. Update the tables (Light Mode Anchors, Dark Mode Anchors, Components) to match.

Keep the YAML frontmatter format that DESIGN.md uses, and re-run `bun run design:lint` after editing.

## TODO
- [ ] Wait for surface vocabulary + customization scope decisions
- [ ] Rewrite Colors / Surfaces / Components sections
- [ ] Update front-matter values to match reality
- [ ] Re-run design:lint
