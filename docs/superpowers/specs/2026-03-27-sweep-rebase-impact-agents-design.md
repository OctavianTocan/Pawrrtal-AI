# Sweep Rebase Impact Agents

**Date:** 2026-03-27
**Status:** Approved
**Scope:** Update sweep skill's rebase handling to prevent regressions via deep agent-based analysis

## Problem

After a clean `git rebase`, sweep's current overlap detection identifies affected files and shows diff summaries — but that's too shallow. It misses two categories of regression that have occurred multiple times:

1. **Stale approaches** — main introduced a new utility/pattern (e.g., `apiClient` wrapper), but the PR still uses the old way (raw `fetch()`). Git merges cleanly because different lines were touched, but the PR's approach is now inconsistent with the codebase.

2. **Behavioral conflicts** — main changed how a function behaves (new parameter, different return type, changed side effects), and the PR's code still assumes the old behavior. Text-level merge succeeds, but runtime behavior breaks.

## Solution

Replace the current shallow diff-summary approach with a **two-pass analysis system**: a fast triage pass that classifies overlap files by risk, followed by sequential deep-analysis agents for files that need it.

When `$OVERLAP` is empty (no overlapping files between base branch changes and PR changes), the existing behavior is preserved — log "no overlap" and continue. The two-pass system only activates when overlap files exist.

### Pass 1: Fast Triage (No Agents)

For each overlap file detected after rebase, the main flow reads both diffs and classifies using heuristics:

| Classification | Criteria | Action |
|---|---|---|
| `likely_safe` | Diffs touch unrelated sections, no new exports/patterns introduced by main | Continue, no agent needed |
| `trivial_fix` | Renamed imports, updated paths, new utility adoption with obvious 1:1 mapping | Fix inline, no agent needed |
| `needs_deep_analysis` | See heuristics below | Spawn analysis agent |

**Heuristics for `needs_deep_analysis`:**
- Main introduced new exports/functions that didn't exist before (stale approach signal)
- Main changed function signatures, return types, or parameter lists that PR calls (behavioral conflict signal)
- Main modified the same function body the PR also modifies (high collision risk)

Everything not matching these heuristics is `likely_safe` or `trivial_fix`.

**Escape hatch for triage misclassification:**
- **Single mode:** After presenting triage results, let the user promote any `likely_safe` file to `needs_deep_analysis` before agents run.
- **Batch mode:** If total overlap file count is 3 or fewer, skip triage and run agents on ALL overlap files regardless — the cost is low and it eliminates misclassification risk.

**Resolving dependents (import graph):**
Use `grep -r "from.*<overlap_file_stem>" --include='*.ts' --include='*.tsx'` (adjusted for project language) with path normalization to find files that import the overlap file. This is a best-effort heuristic, not a full AST analysis.

### Pass 2: Deep Analysis (Sequential Agents)

For each `needs_deep_analysis` file, spawn one analysis agent sequentially. Each agent receives:

1. **Both diffs** — what main changed vs what PR changed in this file
2. **Full current state** — the complete file content post-rebase. If file exceeds 500 lines, truncate to functions touched by either diff +/- 50 lines of context.
3. **Immediate dependents** — import statements and functions that reference the overlap file from dependent files (not full file content). Max 5 dependents, prioritized by: files the PR also modifies > files with the most references.
4. **Cross-file summary** — list of ALL overlap files + what main changed in each (for cross-file awareness)

**Agent timeout and failure handling:**
- Timeout: 2 minutes per agent
- Malformed output (non-JSON or missing required fields): treat as verdict `needs_deep_analysis` with `confidence: "low"`, escalate in batch mode, flag to user in single mode
- Timeout: same as malformed — escalate with reason "analysis timed out"

Each agent returns a structured verdict:

```json
{
  "file": "src/api/fetcher.ts",
  "verdict": "stale_approach | behavioral_conflict | safe | trivial_fix",
  "confidence": "high | medium | low",
  "summary": "Main introduced apiClient wrapper. PR still uses raw fetch() with custom error handling.",
  "stale_patterns": ["raw fetch() -> should use apiClient"],
  "behavioral_changes": [],
  "suggested_fix": "Replace fetch() calls with apiClient equivalents, preserve PR's error handling logic",
  "affected_lines": ["src/api/fetcher.ts:45-67", "src/api/fetcher.ts:112-130"],
  "cross_file_note": "types.ts also changed -- ApiResponse type has new retryCount field"
}
```

**When an agent disagrees with triage** (returns `safe` or `trivial_fix` for a `needs_deep_analysis` file): this is a successful demotion — triage was overly cautious. Apply trivial fixes inline or skip. This is the happy path, not an error.

**Agents are read-only analyzers.** They never edit files. Fixes are applied by the main sweep flow.

### Mode Behavior

**Single mode (interactive):**
- Present all agent findings grouped by severity (stale_approach/behavioral_conflict first)
- For each finding, show: what main changed, what the PR assumes, and the suggested fix
- Ask user: "Fix this? (yes / skip / review in detail)"
- User can review the full agent analysis before deciding

**Batch mode (autonomous):**
- `trivial_fix` — auto-fix, commit
- `safe` — continue
- `stale_approach` or `behavioral_conflict` — **escalate**: include in the SWEEP_REPORT's `REBASE_IMPACT` section with `ACTION: escalated` and surface in the single final summary comment. Subagent does NOT attempt to fix these autonomously and does NOT post a separate PR comment (respects the "one final summary comment" rule).
- Low confidence verdicts are always treated as escalation regardless of verdict type

### Agent Prompt Template

This prompt lives in `references/rebase-analysis-agent.md` and is the source of truth.

```
You are analyzing whether a PR's changes are still correct after rebasing
onto {BASE_BRANCH}.

## Your File: {overlap_file}

### What main changed in this file:
{base_diff}

### What the PR changes in this file:
{pr_diff}

### Current state of the file (post-rebase):
{full_file_content_or_truncated}

### Functions in dependent files that reference this file:
{dependent_references}

### All overlap files (for cross-file awareness):
{summary_of_all_overlaps}

## Your Task

1. Check for STALE APPROACHES: Did main introduce new patterns, utilities,
   or abstractions that the PR should be using instead of its current
   approach? Look for new exports, wrapper functions, or refactored
   patterns that supersede what the PR does.

2. Check for BEHAVIORAL CONFLICTS: Did main change function signatures,
   return types, side effects, or contracts that the PR's code assumes?
   Check both the overlap file and its dependents for assumption
   mismatches.

3. For each issue found, explain:
   - What main changed (specific lines/functions)
   - What the PR assumes (specific lines/functions)
   - Why this is a regression risk
   - How to fix it (preserve PR's intent while adopting main's changes)

4. Return a structured JSON verdict with these exact fields:
   - "file": string — the overlap file path
   - "verdict": "stale_approach" | "behavioral_conflict" | "safe" | "trivial_fix"
   - "confidence": "high" | "medium" | "low"
   - "summary": string — one-paragraph explanation
   - "stale_patterns": string[] — patterns main introduced that PR should adopt
   - "behavioral_changes": string[] — behavioral changes PR doesn't account for
   - "suggested_fix": string — how to fix (minimal, preserving PR intent)
   - "affected_lines": string[] — file:line references for affected code
   - "cross_file_note": string | null — notes about other overlap files

## Rules
- You are a READ-ONLY analyzer. Do not suggest rewriting the PR.
  Suggest minimal changes that align the PR with main's new state.
- If you're uncertain, set confidence to "low" — false negatives
  (missing a real issue) are worse than false positives.
- Check dependents: a function signature change in the overlap file
  may break callers that the PR also modified.
- Return ONLY the JSON object. No markdown, no explanation outside the JSON.
```

### Integration Points

| Location | Change |
|---|---|
| `SKILL.md` "Rebase Impact Analysis" section | Update to describe the two-pass agent-based approach, reference new cookbook/references files |
| `cookbook/single.md` Step 3 | After rebase + overlap detection: run triage (with user escape hatch), spawn agents, present findings |
| `references/autonomous-sweep.md` Step 2 | After auto-rebase + overlap detection: run triage (with <=3 shortcut), spawn agents, auto-fix trivial, escalate dangerous using `REBASE_IMPACT` section with `ACTION: escalated` |
| New file: `references/rebase-analysis-agent.md` | Agent prompt template + verdict schema (derived from "Agent Prompt Template" section above) |
| New file: `cookbook/rebase-triage.md` | Triage heuristics + classification logic + dependent resolution (derived from "Pass 1" section above). Shared by single and batch modes. |

### Safety Guarantees

1. Agents are read-only — they analyze but never edit
2. Fixes applied by the main sweep flow, subject to all existing gates
3. Batch mode never auto-fixes stale approaches or behavioral conflicts
4. Build verification loop still runs after any rebase-related fixes
5. Low confidence = escalation, always
6. Sequential agent spawning prevents token explosion on many overlap files
7. Fast triage filters out safe/trivial files before spending agent tokens
8. Agent timeout (2 min) prevents hangs; failures escalate rather than silently passing
9. Batch mode with <=3 overlap files skips triage entirely for maximum safety

### What This Does NOT Change

- The existing rebase check (`git merge-base --is-ancestor`) remains the trigger
- The overlap file detection algorithm stays the same
- Build verification, self-review, pattern learning, and all other post-fix steps are untouched
- Comment classification, pattern grouping, and fix loop behavior are unaffected
- The `REBASE_IMPACT` report field is extended with `ACTION: escalated` alongside existing `auto-fixed` and `needs-review` values
