# Lossless Context Management (LCM) for Pawrrtal

**Status:** in progress — schema landed, runtime activation in stacked PRs
**Inspiration:** [Martian-Engineering/lossless-claw](https://github.com/Martian-Engineering/lossless-claw) (TypeScript, OpenClaw plugin)
**Why a port instead of vendoring:** lossless-claw plugs into the OpenClaw `ContextEngine` lifecycle that doesn't exist in our FastAPI + Postgres stack.  Re-implementing the algorithm natively beats stitching a Node.js sidecar into every chat turn.

## Problem

Today the chat router does `chat_messages` `ORDER BY ordinal LIMIT 20`.  Anything older than the last 20 messages is invisible to the model.  Long conversations silently lose continuity.

## Approach

A DAG of summaries that grows as a conversation grows:

1. **Persist every message** (we already do this in `chat_messages`).
2. **Periodically summarise** the oldest non-protected messages into a **leaf summary**.
3. **Condense** accumulated leaf summaries into deeper parent summaries to keep the assembled list short.
4. **Assemble** each turn's prompt from: (a) the protected **fresh tail** of recent raw messages + (b) as many of the most recent summary/message items as fit in the model's window.

## Data model (this PR — #1 of the stack)

Three tables in `app/models.py`:

| Table | Role |
| --- | --- |
| `lcm_summaries` | A summary node.  `depth=0` is a leaf (summarises raw messages); `depth>=1` is a condensed parent. |
| `lcm_summary_sources` | Link table from a summary to its source items.  `source_kind` discriminates `message` vs `summary`. |
| `lcm_context_items` | The ordered "replacement list" assembled per turn.  Each row points at a `ChatMessage` (raw) or an `LCMSummary` (compacted).  Compaction rewrites rows in place. |

See `app/models.py` for the SQLAlchemy definitions and inline comments.

## Config

All settings default OFF / safe — adding the schema doesn't change behaviour for any existing deployment.

| Env / setting | Default | Meaning |
| --- | --- | --- |
| `LCM_ENABLED` | `false` | Master switch.  Later stack PRs gate every code path on this. |
| `LCM_FRESH_TAIL_COUNT` | `64` | Recent messages always kept verbatim. |
| `LCM_LEAF_CHUNK_TOKENS` | `20000` | Source-token ceiling per leaf summary. |
| `LCM_CONTEXT_THRESHOLD` | `0.75` | Fraction of model window that triggers auto-compaction. |
| `LCM_INCREMENTAL_MAX_DEPTH` | `1` | Condensation passes per leaf compaction.  `-1` = unlimited. |
| `LCM_SUMMARY_MODEL` | (unset → same as conversation) | Model used for summarisation calls. |

## Stack roadmap

This PR ships **schema only**.  Subsequent PRs in the stack:

1. ✅ **Schema + models** (this PR)
2. ⏭ **Ingest + assembly** — wire every ChatMessage into an `LCMContextItem`; replace `LIMIT 20` with `assemble_context()` (fresh tail only at first)
3. ⏭ **Leaf compaction** — first real summarisation pass
4. ⏭ **`lcm_grep` tool** — agent-callable history search
5. ⏭ **`lcm_describe` tool** — cheap summary inspection
6. ⏭ **`lcm_expand_query` tool** — bounded sub-agent for deep recall
7. ⏭ **Condensation pass** — depth-1+ summaries

Each is a tracer-bullet PR — one main feature, end-to-end, minimal scope.  Things deferred from each PR are captured in `.beans/lcm-followups.md`.

## Why this design and not theirs verbatim

The upstream plugin makes excellent choices that we adopt:
- DAG of summaries, not a flat rolling buffer.
- Fresh-tail protection so recent context is never compressed.
- Three-level escalation (normal prompt → aggressive → deterministic truncation).
- Tool surface (`grep`, `describe`, `expand_query`) so the agent can drill into compacted history on demand.

Where we diverge:
- **Postgres, not SQLite.**  We already run Postgres; adding SQLite for one feature would mean two DB volumes and two migration stories.
- **In-process, not subagent-spawning via plugin SDK.**  Their `lcm_expand_query` spawns an OpenClaw sub-agent through the plugin runtime.  We'll use our existing agent_loop infrastructure when we get to that PR.
- **No `/lcm doctor` command yet.**  Operational tooling can come later — health probes already cover the obvious failure modes.
