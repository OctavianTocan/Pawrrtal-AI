---
# pawrrtal-ib05
title: Add ruff + mypy to backend, wire into justfile
status: completed
type: task
priority: normal
created_at: 2026-05-04T08:59:22Z
updated_at: 2026-05-04T09:07:38Z
---

Backend has zero Python linters configured. Add ruff (lint + format) and mypy (type-check) to backend/pyproject.toml dev deps with strict-ish config aligned with project rules (type hints required, no cast(Any), Literal over str, docstrings on exports). Wire into root justfile so 'just check' covers Python and add 'just lint-py' / 'just typecheck' / 'just format-py' / 'just check-py' shortcuts.

## Todo
- [x] Add ruff + mypy to backend dev deps
- [x] Add [tool.ruff] and [tool.mypy] config to backend/pyproject.toml
- [x] Run ruff format on backend (one-time formatting baseline)
- [x] Add lint-py / typecheck / format-py / check-py recipes to root justfile
- [x] Update top-level 'check' / 'lint' recipes to include Python
- [x] Verify tests still pass after formatting

## Summary of Changes

**Tools added** (in `backend/pyproject.toml` dev deps):
- `ruff>=0.14.0` — lint + format (replaces black/isort/flake8/pyupgrade)
- `mypy>=1.18.0` — strict static type-check (with pydantic plugin)

**Ruff config** — selected E/W/F/I/B/UP/SIM/ASYNC/PL/RUF/D rule families with Google-convention docstrings, target Python 3.13, line length 100. Per-file ignores for tests, conftest (sys.path manipulation), and Alembic migrations.

**Mypy config** — `strict = true` with `explicit_package_bases` (needed because `app.models` and `app.api.models` collide), pydantic plugin, ignore_missing_imports for `agno`/`mcp`/`sqlalchemy_utils`.

**Justfile recipes wired in:**
- `just lint-py` — ruff check (read-only)
- `just lint-py-fix` — ruff check --fix
- `just format-py` — ruff format
- `just check-py` — ruff check + format check (no writes) — wired into `just check` so it gates on Python now
- `just typecheck` — mypy, advisory (leading `-` so non-zero exit doesn't fail the recipe; surfaces tech debt without blocking the gate)
- `just check-all` — `check` + `typecheck` for a full health pass before pushing
- Top-level `lint` / `format` / `check` / `lint-fix` recipes now run their Python siblings as dependencies

**Code fixes from the lint sweep** (all real findings — kept where the project rules call for them):
- `app/users.py` — extracted `MIN_PASSWORD_LENGTH = 8` constant (per `clean-code/named-constants.md`)
- `app/api/conversations.py` — extracted `MAX_GENERATED_TITLE_LENGTH = 80` constant
- `app/cli/commit.py` — added `check=False` to `subprocess.run` calls (PLW1510)
- `app/db.py` — converted relative `from . import models` to absolute `from app import models` for mypy
- `app/core/providers/base.py` — fixed `AIProvider.stream` Protocol declaration (was `async def` returning `AsyncIterator`, which mypy correctly read as a coroutine; changed to plain `def` since async generators return iterators directly when called)
- Added missing docstrings to `get_auth_router`, `get_models_router`, `StreamEvent`, `validate_secure_cookie`, `validate_password`, `create_update_dict*`, `commit.main`, `AgnoProvider.stream`
- Reformatted 2 D205 docstrings in `config.py`
- `tests/test_claude_provider.py` — added inline `noqa: PLC0415` on intentional late imports for monkeypatch isolation
- 14 files reformatted by `ruff format` (one-time baseline)

**Final state:**
- `just check`: passes (ruff + biome both green)
- `just typecheck`: 19 pre-existing mypy findings in 12 files (legacy tech debt — fix incrementally)
- `just test`: 84 passed in 0.64s
