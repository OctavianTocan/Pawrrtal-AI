# Changelog

## Unreleased

- Added Lossless Context Management (LCM): a DAG-based conversation compaction system that summarises older turns into queryable `LCMSummary` nodes while preserving a verbatim fresh tail. Off by default behind `lcm_enabled`; opt-in via six new settings (`lcm_fresh_tail_count`, `lcm_leaf_chunk_tokens`, `lcm_context_threshold`, `lcm_incremental_max_depth`, `lcm_summary_model`).
- Added four LCM agent tools (`lcm_grep`, `lcm_describe`, `lcm_list_summaries`, `lcm_expand_query`) so the agent can search, enumerate, inspect, and synthesise across compacted history when context grows past the fresh tail.
- Added background leaf compaction after every chat turn, plus a condensation pass that folds same-depth summaries into deeper parent nodes (configurable up to an unlimited cascade).
- Added provider-native replay state: the agent loop now forwards opaque `provider_state` from `LLMDoneEvent` onto the assistant message so Gemini can replay `ModelContent` (preserving `thought_signature` bytes) on follow-up tool turns without leaking the slot into transcripts or persistence.
- Added migration `015_add_lcm_tables` (`lcm_summaries`, `lcm_summary_sources`, `lcm_context_items`) with the unique `(conversation_id, ordinal)` constraint and cascade FKs from each LCM table to `conversations`.
- Added startup refresh for Telegram slash commands so the bot menu matches the current server build.
- Added verbose Telegram delivery for tool activity and thinking events.
- Fixed default workspace creation races so losing inserts clean up their seeded directory asynchronously.
- Renamed agent tool labels from `ai_nexus` to `pawrrtal`.
