---
# ai-nexus-ejxj
title: Re-enable Biome linting on UI component files and port custom rules from web-ce-shared-packages
status: todo
type: task
priority: low
created_at: 2026-03-26T05:35:21Z
updated_at: 2026-03-26T05:35:21Z
---

Currently `frontend/components/ui/**` has linting, formatting, and assist fully disabled in biome.json (added as a blanket override to unblock development). This needs to be cleaned up.

## Tasks

- [ ] Re-enable Biome linting on `frontend/components/ui/**`
- [ ] Fix all linting issues that surface in those files
- [ ] Re-enable Biome formatting on `frontend/components/ui/**`
- [ ] Fix all formatting issues
- [ ] Port custom Biome rules from `web-ce-shared-packages` project into this project's biome.json
- [ ] Fix any new violations those rules surface across the entire frontend

## Notes

- The `web-ce-shared-packages` project has custom linting rules that should be examined and ported. Check its `biome.json` for the exact rule set.
- `layout.tsx` has a scoped override for `noDangerouslySetInnerHtml` (blocking theme script) — that override should stay.
- Do NOT assume what the custom rules are — read them from the source project first.
