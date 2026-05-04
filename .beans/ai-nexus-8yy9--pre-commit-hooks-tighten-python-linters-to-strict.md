---
# ai-nexus-8yy9
title: Pre-commit hooks + tighten Python linters to strict
status: completed
type: task
priority: normal
created_at: 2026-05-04T09:09:31Z
updated_at: 2026-05-04T09:16:18Z
---

Add pre-commit framework with ruff/mypy/biome/secret-scan hooks. Tighten ruff ruleset (security, performance, complexity, more pylint rules). Add bandit for security scanning. Make sure all hooks run fast on staged files only.

## Todo
- [x] Add pre-commit + bandit to backend dev deps
- [x] Create .pre-commit-config.yaml with ruff (lint+format), mypy, bandit, biome, generic file checks
- [x] Tighten ruff ruleset (S=bandit-rules, PERF, C90 complexity, more PL/RUF/N/A/TID/PTH/RET)
- [x] Run pre-commit autoupdate to pin latest versions
- [x] Run pre-commit run --all-files and fix or ignore findings
- [x] Add 'install-hooks' / 'pre-commit' / 'pre-commit-all' recipes to justfile
- [x] Auto-install hooks on 'just install'

## Summary of Changes

**Tooling added** (`backend/pyproject.toml` dev deps):
- `bandit[toml]>=1.7.10` — security scanner (subprocess, eval, weak crypto, etc.)
- `pre-commit>=4.0.0` — git hook framework
- `types-pyyaml>=6.0.12` — type stubs

**Ruff ruleset tightened** — added rule families: `N` (naming), `A` (no shadowing builtins), `C4` (comprehensions), `C90` (mccabe complexity ≤12), `PERF` (perflint), `PT` (pytest-style), `PTH` (pathlib over os.path), `RET` (return flow), `S` (bandit/security), `T20` (no stray prints), `TID` (tidy imports), `TRY` (exception antipatterns). Same-package relative imports allowed; parent-traversing banned.

**Bandit security scan** added at `[tool.bandit]` — ruff covers most overlapping rules per-file, bandit catches the rest (excludes `tests/` and `app/cli/` where subprocess use is intentional).

**Pre-commit hooks** (`.pre-commit-config.yaml`):
- Generic: trailing-whitespace, end-of-file-fixer, mixed-line-ending, merge-conflict, large-files (500KB cap), check-yaml, check-toml, check-json (excludes JSONC files), detect-private-key, case-conflicts
- Secrets: `gitleaks` (catches AWS/GitHub/API keys)
- Python: `ruff-check` + `ruff-format` (auto-fix on commit), `mypy` (advisory via local hook using project venv — won't block commits but reports findings), `bandit`
- JS/TS/JSON: `biome-check` v2.4.10 (matched to frontend/package.json)
- commit-msg: `conventional-pre-commit` enforces `feat/fix/chore/refactor/docs/test/perf/build/ci/revert`

**Justfile recipes added**:
- `just install-hooks` — install git hooks (auto-runs on `just install` now)
- `just update-hooks` — `pre-commit autoupdate` to refresh hook versions
- `just pre-commit` — run hooks on staged files
- `just pre-commit-all` — run all hooks across the repo (use before PRs)
- `just security-py` — bandit Python security scan
- `just check-all` — full health gate (`check` + `security-py` + `typecheck`)

**Lint sweep fixes** from the strict ruleset:
- Added `# noqa: C901` to `_extract_message_text` and `get_conversations_router` (FastAPI router builders aggregate route handlers — complexity reflects route count not branching)

**Final state**:
- `just check`: ✅ ruff + biome green
- `just check-all`: ✅ exit=0 (typecheck advisory still reports 19 legacy mypy findings)
- `just pre-commit-all`: ✅ all 16 hooks pass
- `just test`: ✅ 84 passed in 0.53s

**Files modified**:
- `backend/pyproject.toml` — strict ruff ruleset, bandit config, pre-commit + bandit added to dev deps
- `backend/app/api/conversations.py` — added complexity noqa comments to 2 legacy functions
- `justfile` — 6 new recipes (install-hooks, update-hooks, pre-commit, pre-commit-all, security-py, expanded check-all); auto-install hooks via `just install`
- `.pre-commit-config.yaml` *(new)* — full hook config with 16 hooks
