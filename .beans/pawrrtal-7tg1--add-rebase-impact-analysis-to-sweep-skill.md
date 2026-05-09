---
# pawrrtal-7tg1
title: Add rebase impact analysis to /sweep skill
status: completed
type: task
priority: normal
created_at: 2026-03-25T17:50:30Z
updated_at: 2026-03-25T17:52:05Z
---

After rebasing on main, check for files changed by BOTH the base branch and the PR. A clean git rebase doesn't mean the PR's logic is still correct — main may have changed utilities, patterns, or logic in the same files, creating silent inconsistencies. Add this analysis to single.md Step 3, autonomous-sweep.md Step 2, and SKILL.md concept section.

## Summary of Changes\n\nAdded **Rebase Impact Analysis** to the /sweep skill — after a successful rebase, sweep now checks whether the base branch changed files that the PR also modifies. A clean git rebase doesn't mean the PR's logic is still correct.\n\n### Files changed:\n- **SKILL.md** — New concept section explaining the problem and approach\n- **cookbook/single.md** — Step 3 expanded: captures OLD_MERGE_BASE before rebasing, runs overlap analysis after, presents findings to user. Pipeline checklist updated.\n- **references/autonomous-sweep.md** — Step 2 expanded: same analysis for batch mode subagents, with auto-fix for straightforward inconsistencies and REBASE_IMPACT items in SWEEP_REPORT for judgment calls.\n- **cookbook/batch.md** — Report section updated to surface REBASE_IMPACT items from subagents.
