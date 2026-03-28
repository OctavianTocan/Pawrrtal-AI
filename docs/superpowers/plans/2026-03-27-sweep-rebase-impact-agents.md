# Sweep Rebase Impact Agents — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace sweep's shallow rebase diff-summary with a two-pass system (fast triage + sequential deep-analysis agents) that prevents stale-approach and behavioral-conflict regressions.

**Architecture:** Two new files define the reusable pieces (triage logic + agent prompt). Three existing files are updated to invoke them at the right point in the workflow. All files are markdown skill documentation — no application code.

**Tech Stack:** Markdown skill files, git CLI, grep for dependency resolution

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `cookbook/rebase-triage.md` | **Create** | Triage heuristics, classification logic, dependent resolution. Shared by single + batch. |
| `references/rebase-analysis-agent.md` | **Create** | Agent prompt template + verdict JSON schema + timeout/failure handling. |
| `SKILL.md` | **Modify** lines 104-115 | Update "Rebase Impact Analysis" section to describe two-pass approach + reference new files. |
| `cookbook/single.md` | **Modify** lines 179-211 | Replace shallow overlap analysis with triage → agents → findings presentation. Lines 160-177 (header, overlap detection, empty check) are preserved. |
| `references/autonomous-sweep.md` | **Modify** lines 66-88 + line 367 | Replace shallow overlap analysis with triage → agents → escalation. Lines 56-63 (header, overlap detection) preserved. Also update REBASE_IMPACT in SWEEP_REPORT template (line 367). |

All paths are relative to `/Volumes/Crucial X10/Projects/agentkit/skills/sweep/`.

---

## Task 1: Create `cookbook/rebase-triage.md`

**Files:**
- Create: `cookbook/rebase-triage.md`

- [ ] **Step 1: Write the triage cookbook**

Create `cookbook/rebase-triage.md` with these sections:

1. **Context** — When this runs (after rebase, when $OVERLAP is non-empty). Shared by single.md and autonomous-sweep.md.

2. **Batch-mode shortcut** — If total overlap file count is 3 or fewer, skip triage entirely and classify ALL as `needs_deep_analysis`. The token cost is low and eliminates misclassification risk.

3. **Triage classification table** — Three classifications with criteria and actions:
   - `likely_safe` — diffs touch unrelated sections, no new exports/patterns
   - `trivial_fix` — renamed imports, updated paths, obvious 1:1 utility adoption
   - `needs_deep_analysis` — matches any deep-analysis heuristic

4. **Deep-analysis heuristics** — How to detect each signal by reading the diffs:
   - Main introduced new exports/functions (look for `+export` lines in base diff that don't exist in old code)
   - Main changed function signatures/return types/parameter lists that PR calls (look for modified function declarations in base diff, then check if PR diff calls those functions)
   - Main modified the same function body the PR also modifies (both diffs have hunks in the same function)

5. **Resolving dependents** — grep-based heuristic:
   ```bash
   # Find files importing the overlap file (adjust extensions for project language)
   grep -rl "from.*<overlap_file_stem>" --include='*.ts' --include='*.tsx' --include='*.js' --include='*.jsx' .
   ```
   Prioritize: files the PR also modifies first, then by reference count. Max 5 dependents.

6. **Escape hatch (single mode only)** — After presenting triage results, let the user promote any `likely_safe` file to `needs_deep_analysis` before agents run.

7. **Trivial fix handling** — For `trivial_fix` files, fix inline (renamed imports, updated paths) without spawning an agent. Commit separately.

- [ ] **Step 2: Verify the file**

Read `cookbook/rebase-triage.md` back and confirm:
- All 7 sections are present
- Heuristics are concrete (what to grep/read in diffs), not vague
- Batch shortcut is clearly stated
- Dependent resolution includes the grep command

- [ ] **Step 3: Commit**

```bash
cd "/Volumes/Crucial X10/Projects/agentkit"
git add skills/sweep/cookbook/rebase-triage.md
git commit -m "feat(sweep): add rebase triage cookbook

Shared triage logic for classifying overlap files as likely_safe,
trivial_fix, or needs_deep_analysis. Includes grep-based dependent
resolution and batch-mode shortcut for <=3 files.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: Create `references/rebase-analysis-agent.md`

**Files:**
- Create: `references/rebase-analysis-agent.md`

- [ ] **Step 1: Write the agent reference**

Create `references/rebase-analysis-agent.md` with these sections:

1. **Purpose** — This is the prompt template for deep-analysis agents spawned during rebase impact analysis. One agent per `needs_deep_analysis` file, run sequentially.

2. **Agent prompt template** — The full prompt with placeholders (`{overlap_file}`, `{base_diff}`, `{pr_diff}`, `{full_file_content_or_truncated}`, `{dependent_references}`, `{summary_of_all_overlaps}`, `{BASE_BRANCH}`). Copy verbatim from spec lines 97-154.

3. **Input preparation** — Instructions for the caller on how to prepare each placeholder:
   - `full_file_content_or_truncated`: If file exceeds 500 lines, extract functions touched by either diff +/- 50 lines of context instead of full file.
   - `dependent_references`: Import statements and function bodies that reference the overlap file from up to 5 dependent files. Not full file content.
   - `summary_of_all_overlaps`: One line per overlap file: `<path> — main: <summary of base diff>`.

4. **Verdict JSON schema** — The full schema with field descriptions. Include example for each verdict type (stale_approach, behavioral_conflict, safe, trivial_fix).

5. **Timeout and failure handling**:
   - Timeout: 2 minutes per agent
   - Malformed output (non-JSON or missing required fields): treat as `confidence: "low"`, escalate
   - Timeout: same as malformed — escalate with reason "analysis timed out"

6. **Agent demotion** — When agent returns `safe` or `trivial_fix` for a `needs_deep_analysis` file, this is a successful demotion (triage was overly cautious). Apply trivial fixes inline or skip. Not an error.

- [ ] **Step 2: Verify the file**

Read `references/rebase-analysis-agent.md` back and confirm:
- Prompt template is complete with all placeholders
- JSON schema has all 9 fields with types
- Examples cover all 4 verdict types
- Timeout/failure handling is explicit
- Input preparation rules are concrete (500 line cap, 50 line context, 5 dependents max)

- [ ] **Step 3: Commit**

```bash
cd "/Volumes/Crucial X10/Projects/agentkit"
git add skills/sweep/references/rebase-analysis-agent.md
git commit -m "feat(sweep): add rebase analysis agent prompt template

Prompt template + verdict schema for deep-analysis agents that detect
stale approaches and behavioral conflicts in overlap files after rebase.
Includes input preparation rules, timeout handling, and examples.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: Update `SKILL.md` — Rebase Impact Analysis section

**Files:**
- Modify: `SKILL.md` lines 104-115

- [ ] **Step 1: Replace the Rebase Impact Analysis section**

Replace lines 104-115 of `SKILL.md` (the current "Rebase Impact Analysis" section) with the updated version that describes the two-pass approach.

The new section should:
- Keep the opening paragraph explaining WHY clean rebases can still break logic (the fetch/apiClient example)
- Keep the "How it works" paragraph about capturing OLD_MERGE_BASE and finding overlap files
- Replace the bullet points about single/batch behavior with a reference to the two-pass system:
  - **Pass 1: Fast Triage** — classifies overlap files without agents. See `cookbook/rebase-triage.md`.
  - **Pass 2: Deep Analysis** — spawns sequential agents for `needs_deep_analysis` files. See `references/rebase-analysis-agent.md`.
- Add mode behavior summary:
  - Single mode: present findings, user decides (with escape hatch to promote files)
  - Batch mode: auto-fix trivial, escalate stale_approach/behavioral_conflict via `REBASE_IMPACT` with `ACTION: escalated`
- Add safety note: agents are read-only, batch never auto-fixes dangerous verdicts, low confidence = always escalate

Also add these exact rows to the existing tables:

**Cookbook table** (after the `stats` row):
```
| rebase-triage | [cookbook/rebase-triage.md](cookbook/rebase-triage.md) | Classify overlap files after rebase: likely_safe, trivial_fix, or needs_deep_analysis (called by single and batch) |
```

**References table** (after the `lessons-schema.md` row):
```
| [references/rebase-analysis-agent.md](references/rebase-analysis-agent.md) | Agent prompt template for deep analysis of overlap files after rebase |
```

- [ ] **Step 2: Verify the edit**

Read back SKILL.md lines 68-120 (cookbook table through rebase section) and confirm:
- Cookbook table has `rebase-triage` entry
- References table has `rebase-analysis-agent.md` entry
- Rebase Impact Analysis section references both new files
- The fetch/apiClient example is preserved
- Mode behavior is summarized (not duplicated from cookbook)

- [ ] **Step 3: Commit**

```bash
cd "/Volumes/Crucial X10/Projects/agentkit"
git add skills/sweep/SKILL.md
git commit -m "feat(sweep): update SKILL.md rebase section for agent-based analysis

Replace shallow diff-summary approach with two-pass system references.
Add rebase-triage cookbook and rebase-analysis-agent reference entries.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: Update `cookbook/single.md` — Step 3 Post-Rebase Impact Analysis

**Files:**
- Modify: `cookbook/single.md` lines 179-211 (keep lines 160-177 intact)

- [ ] **Step 1: Replace the shallow analysis after overlap detection**

Replace lines 179-211 of `cookbook/single.md` (the shallow "for each overlapping file" analysis and user prompt) with the new two-pass version.

**Keep intact:** Lines 160-177 (the `#### Post-Rebase Impact Analysis` header, the "only runs when rebase happened" note, the overlap detection bash commands, and the "if $OVERLAP is empty" line). Also keep the overlap detection commands:
```bash
BASE_CHANGED=$(git diff --name-only $OLD_MERGE_BASE..origin/<BASE_BRANCH>)
PR_CHANGED=$(git diff --name-only origin/<BASE_BRANCH>..HEAD)
OVERLAP=$(comm -12 <(echo "$BASE_CHANGED" | sort) <(echo "$PR_CHANGED" | sort))
```

**Keep unchanged:** The "If `$OVERLAP` is empty" line.

**Replace everything after overlap detection** (lines 179-211) with:

1. **Reference triage** — "Read and follow `cookbook/rebase-triage.md` to classify each overlap file."

2. **Present triage results** — Show the user the classification of each file:
   ```
   Rebase impact triage (N overlap files):
     likely_safe (N):
       src/utils/format.ts — diffs touch unrelated sections
     trivial_fix (N):
       src/api/types.ts — renamed import (ApiResponse → ApiResponseV2)
     needs_deep_analysis (N):
       src/api/fetcher.ts — main introduced apiClient wrapper, PR uses raw fetch()

   Promote any likely_safe file to deep analysis? (file names / no)
   ```

3. **Handle trivial fixes** — Fix renamed imports/paths inline. Commit:
   ```bash
   git add -A
   git commit -m "fix: align trivial imports with upstream changes"
   ```

4. **Spawn deep-analysis agents** — For each `needs_deep_analysis` file, sequentially:
   - Prepare agent inputs per `references/rebase-analysis-agent.md` input preparation rules
   - Spawn agent with the prompt template from `references/rebase-analysis-agent.md`
   - Collect verdict JSON
   - Handle timeout/malformed output per the reference doc

5. **Present agent findings** — Group by severity (stale_approach + behavioral_conflict first):
   ```
   Deep analysis results:

     STALE APPROACH — src/api/fetcher.ts (high confidence)
       Main: introduced apiClient wrapper replacing raw fetch()
       PR: adds error handling to raw fetch() calls
       Fix: replace fetch() calls with apiClient, preserve error handling logic
       Affected: src/api/fetcher.ts:45-67, src/api/fetcher.ts:112-130

     SAFE — src/hooks/useData.ts (high confidence)
       No issues found.

   Fix stale approach in src/api/fetcher.ts? (yes / skip / review in detail)
   ```

6. **Apply fixes** — For each finding the user approves, make the change. Commit:
   ```bash
   git add -A
   git commit -m "fix: adopt upstream patterns after rebase (agent-verified)"
   ```

- [ ] **Step 2: Verify the edit**

Read back `cookbook/single.md` lines 134-230 (full Step 3) and confirm:
- Rebase check + OLD_MERGE_BASE capture is preserved
- Overlap detection commands are preserved
- Triage is referenced via cookbook/rebase-triage.md
- User escape hatch (promote likely_safe) is present
- Agents are spawned sequentially, not in parallel
- Findings are presented with verdict + confidence + suggested fix
- User chooses per-finding (yes / skip / review in detail)
- Commits are separate for trivial fixes vs agent-verified fixes

- [ ] **Step 3: Commit**

```bash
cd "/Volumes/Crucial X10/Projects/agentkit"
git add skills/sweep/cookbook/single.md
git commit -m "feat(sweep): add agent-based rebase impact analysis to single mode

Replace shallow diff summaries with two-pass system: triage classifies
overlap files, then sequential agents analyze needs_deep_analysis files
for stale approaches and behavioral conflicts. User approves each fix.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: Update `references/autonomous-sweep.md` — Step 2 Post-Rebase Impact Analysis

**Files:**
- Modify: `references/autonomous-sweep.md` lines 66-88 (keep lines 56-63 intact) + line 367 (SWEEP_REPORT template)

- [ ] **Step 1: Replace the shallow analysis after overlap detection + update report template**

Replace lines 66-88 of `references/autonomous-sweep.md` (the "If overlap exists" analysis and auto-fix/judgment section) with the new two-pass version for batch/autonomous mode.

**Keep intact:** Lines 56-63 (the `### Post-Rebase Impact Analysis` header, the "only runs when rebase happened" note, and the overlap detection bash commands).

**Also update the SWEEP_REPORT template** at line 367 to extend the REBASE_IMPACT ACTION values from `auto-fixed|needs-review` to `auto-fixed|escalated`. The `needs-review` value is replaced by `escalated` which carries richer context (verdict type, confidence, summary).

**Replace the analysis section** (lines 66-88) with:

1. **Batch shortcut** — If overlap count is 3 or fewer, skip triage and classify ALL as `needs_deep_analysis`. Otherwise, follow `cookbook/rebase-triage.md` triage logic.

2. **Handle trivial fixes** — Fix renamed imports/paths inline. Commit as before:
   ```bash
   git add -A
   git commit -m "fix: align with upstream changes from {{BASE_BRANCH}}"
   ```

3. **Spawn deep-analysis agents** — For each `needs_deep_analysis` file, sequentially:
   - Prepare agent inputs per `references/rebase-analysis-agent.md`
   - Spawn agent (timeout: 2 minutes)
   - Collect verdict JSON
   - Handle timeout/malformed: treat as `confidence: "low"`, escalate

4. **Process verdicts (autonomous rules)**:
   - `safe` — continue
   - `trivial_fix` (agent demotion) — fix inline, commit
   - `stale_approach` or `behavioral_conflict` — **DO NOT FIX**. Add to SWEEP_REPORT `REBASE_IMPACT` section with `ACTION: escalated` and full verdict details. Continue to fix loop without fixing these.
   - Any verdict with `confidence: "low"` — treat as escalation regardless of verdict type

5. **Update REBASE_IMPACT report format** — Extend the existing format to support escalated items:
   ```
   REBASE_IMPACT:
     - path/file.ts — base: <summary>; PR: <summary>; ACTION: auto-fixed [import rename]
     - path/file.ts — base: <summary>; PR: <summary>; ACTION: escalated [stale_approach, high confidence: "Main introduced apiClient, PR uses raw fetch()"]
     - path/file.ts — base: <summary>; PR: <summary>; ACTION: escalated [analysis timed out]
   ```

- [ ] **Step 2: Verify the edit**

Read back `references/autonomous-sweep.md` lines 39-100 (full Step 2) and confirm:
- Rebase check + OLD_MERGE_BASE is preserved
- Overlap detection is preserved
- Batch shortcut (<=3 files → skip triage) is present
- Agents are spawned sequentially
- Escalation rules are explicit: stale_approach, behavioral_conflict, and low confidence all escalate
- REBASE_IMPACT format shows `ACTION: escalated` with details
- "DO NOT FIX" is emphasized for dangerous verdicts

- [ ] **Step 3: Commit**

```bash
cd "/Volumes/Crucial X10/Projects/agentkit"
git add skills/sweep/references/autonomous-sweep.md
git commit -m "feat(sweep): add agent-based rebase analysis to batch mode

Replace shallow consistency check with two-pass system for autonomous
mode. Batch shortcut skips triage for <=3 files. Dangerous verdicts
(stale_approach, behavioral_conflict, low confidence) escalate to user
via REBASE_IMPACT with ACTION: escalated. Never auto-fixes risky items.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: Sync back to live environment

**Files:**
- Source: `/Volumes/Crucial X10/Projects/agentkit/skills/sweep/`
- Target: `/Users/octaviantocan/.agents/skills/sweep/`

- [ ] **Step 1: Sync agentkit → live**

```bash
rm -rf /Users/octaviantocan/.agents/skills/sweep
cp -R "/Volumes/Crucial X10/Projects/agentkit/skills/sweep" /Users/octaviantocan/.agents/skills/sweep
```

- [ ] **Step 2: Verify sync**

```bash
diff -rq "/Volumes/Crucial X10/Projects/agentkit/skills/sweep" /Users/octaviantocan/.agents/skills/sweep
```

Should output nothing (identical).

- [ ] **Step 3: Push feature branch**

```bash
cd "/Volumes/Crucial X10/Projects/agentkit"
git push -u origin feat/sweep-rebase-impact-agents
```
