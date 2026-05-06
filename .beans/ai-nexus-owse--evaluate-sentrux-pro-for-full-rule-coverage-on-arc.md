---
# ai-nexus-owse
title: Evaluate sentrux Pro for full rule-coverage on architecture gate
status: draft
type: task
priority: low
tags:
    - sentrux
    - tooling
    - investigation
created_at: 2026-05-06T16:58:01Z
updated_at: 2026-05-06T16:58:01Z
---

## Why

`check_rules` MCP call output (2026-05-06):

```json
{
  "pass": true,
  "rules_checked": 4,
  "summary": "✓ All architectural rules pass",
  "truncated": {
    "message": "Checking up to 3 rules. More available with sentrux Pro: https://github.com/sentrux/sentrux",
    "rules_checked": 4,
    "total_rules_defined": 17
  },
  "violation_count": 0,
  "violations": []
}
```

The OSS tier of sentrux only checks **4 of the 17 rules** defined in `.sentrux/rules.toml`. The remaining 13 are silently un-enforced.

We currently believe our architecture is rule-clean because all checked rules pass; however 13/17 rules have never been validated in any session or CI run.

## Plan

- [ ] List the 17 rules in `.sentrux/rules.toml`; identify which 4 are being checked vs which 13 are not
- [ ] Decide whether unchecked rules are worth gating (some may be informational; some may overlap)
- [ ] Evaluate options:
  - (a) Pay for sentrux Pro and unlock full rule check + root-cause diagnostics
  - (b) Restructure `.sentrux/rules.toml` to express the most critical 3-4 invariants in the OSS-checkable subset
  - (c) Implement custom checks for the missing rules outside sentrux (Biome plugin, custom script)
- [ ] Document the decision in `docs/decisions/` as an addendum to the `2026-05-03-adopt-sentrux-architecture-gating.md` ADR

## Notes

- Status `draft` because this needs the rule audit before a real plan can be written.
- This is the audit half; the "shifted bottleneck" half (modularity now leads, not equality) is captured separately in the in-progress parent `ai-nexus-ey9p`.
