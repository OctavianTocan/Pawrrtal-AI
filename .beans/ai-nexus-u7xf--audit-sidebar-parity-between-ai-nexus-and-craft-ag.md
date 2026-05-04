---
# ai-nexus-u7xf
title: Audit sidebar parity between ai-nexus and craft-agents-oss
status: completed
type: task
priority: normal
created_at: 2026-03-26T04:41:51Z
updated_at: 2026-03-26T04:47:07Z
---

Compare sidebar implementations between ai-nexus and craft-agents-oss to identify exact differences. Map which files correspond to which, and document all discrepancies for future reference.

## Findings

Full audit written to `docs/sidebar-parity-audit.md`.
File mapping saved to memory at `sidebar-file-mapping.md`.

### Key Findings
- EntityRow, SearchHeader, group collapsing, New Session button all closely match Craft
- 7 divergences in *existing* features (search placeholder, date format, close button visibility, badge gradient, context menu, menu integration, status icon)
- 20 Craft-only features documented but not in scope yet

## Todo
- [x] Explore craft-agents-oss sidebar
- [x] Explore ai-nexus sidebar
- [x] Document file mapping
- [x] Document all differences
- [x] Save to memory for future reference
