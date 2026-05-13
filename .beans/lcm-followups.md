# LCM follow-ups

Running list of work left after each stacked LCM PR.  See
`docs/design/lcm.md` for the full design.  Cross items off as the
stack lands.

## PR #1 — schema + models (this PR)

**Landed:** `lcm_summaries`, `lcm_summary_sources`, `lcm_context_items`
tables; Alembic migration 012; settings in `app/core/config.py`.

**Out of scope for this PR (intentionally) — picked up in later PRs:**

- [x] Application code that reads/writes the new tables (PR #2) — `ingest_message` + `assemble_context` in `app/core/lcm.py`; wired into `chat.py` behind `lcm_enabled`
- [ ] FK enforcement for `lcm_context_items.item_id` and
      `lcm_summary_sources.source_id` polymorphic targets — currently
      cascade is driven by the parent `conversation_id` FK only
- [ ] Postgres `tsvector` columns on `lcm_summaries.content` and
      `chat_messages.content` for FTS (PR #4 — `lcm_grep`)
- [ ] `lcm_summaries.parent_summary_id` if we want to walk the DAG
      cheaply — defer until condensation lands (PR #7) and we see how
      we actually traverse

## Beyond the tracer-bullet stack

Things the upstream plugin has that we may or may not want, captured
here so the omission is intentional:

- [ ] **Cache-aware compaction** — the upstream plugin keeps a recent
      cache window so back-to-back compactions don't churn the same
      summary.  Worth adding once we observe real compaction cost.
- [ ] **`/lcm` slash commands** (`status`, `backup`, `rotate`, `doctor`).
      Operational nicety; not blocking for v1.
- [ ] **`transcriptGcEnabled`** — pruning the raw `chat_messages` once
      summaries cover them.  Disk is cheap; defer indefinitely.
- [ ] **Subagent timeout + retry policy** for `lcm_expand_query` —
      need real-world numbers before tuning.
- [ ] **Expansion model override** — at the moment one summary model
      handles both compaction and expansion.  Split later if the
      latency profile demands it.
- [ ] **Per-session ignore patterns** (`ignoreSessionPatterns` in the
      upstream).  We don't have cron sessions like OpenClaw does, so
      this is currently irrelevant.
- [ ] **DB rotation** (`/lcm rotate`) — long-term storage hygiene.
      Add when the LCM table sizes become a real concern.
- [ ] **Three-level escalation tuning** — implement normal + aggressive
      + deterministic truncation in PR #3 (leaf compaction), but the
      prompts and token caps will need iteration with real workloads.
- [ ] **Cross-conversation grep** — upstream allows
      `allConversations: true`.  Our `lcm_grep` (PR #4) will land
      scoped-to-current first; cross-conv is a follow-up once we
      figure out the auth + privacy model for it.
