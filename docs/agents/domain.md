# Domain Docs

How the engineering skills should consume this repo's domain documentation when exploring the codebase.

## Before exploring, read these

- **`CONTEXT.md`** at the repo root — does not exist yet. When created, it defines the project's domain language and key concepts. Skills should proceed silently if it doesn't exist and create it lazily when terms are actually resolved.
- **`docs/decisions/`** — architectural decision records. Note: this repo uses `docs/decisions/`, not `docs/adr/`. ADRs in this directory are named `YYYY-MM-DD-<slug>.md` (e.g., `2026-05-03-adopt-sentrux-architecture-gating.md`).

## File structure

Single-context repo:

```
/
├── CONTEXT.md              ← created lazily when domain terms are resolved
├── docs/
│   └── decisions/          ← ADRs (YYYY-MM-DD-<slug>.md)
├── .beans/                 ← task beans
└── frontend/ | backend/
```

## Use the glossary's vocabulary

When your output names a domain concept (in an issue title, a refactor proposal, a hypothesis, a test name), use the term as defined in `CONTEXT.md`. Don't drift to synonyms the glossary explicitly avoids.

If the concept you need isn't in the glossary yet, that's a signal — either you're inventing language the project doesn't use (reconsider) or there's a real gap (note it for `/grill-with-docs`).

## Flag ADR conflicts

If your output contradicts an existing ADR, surface it explicitly rather than silently overriding:

> _Contradicts docs/decisions/2026-05-03-adopt-sentrux-architecture-gating.md — but worth reopening because…_
