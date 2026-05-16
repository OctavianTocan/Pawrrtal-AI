---
# pawrrtal-oofv
title: Add semantic code search rule
status: completed
type: task
priority: normal
created_at: 2026-05-16T22:19:49Z
updated_at: 2026-05-16T22:20:46Z
---

Document that agents should try semantic code search tools such as CodeGraph before raw text search when those tools are available.

## Summary of Changes

Added a root AGENTS.md rule and a Claude general rule requiring agents to try semantic code search tools such as CodeGraph, Serena, or language-server symbol search before broad text search when those tools are available. Documented when to fall back to rg for exact literals, docs, config, generated files, or unavailable semantic tooling.
