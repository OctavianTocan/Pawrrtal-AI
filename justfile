# List available recipes
default:
    @just --list

# Start frontend (Next.js) and backend (FastAPI) dev servers
dev:
    bun run dev.ts

# Auto-generate conventional commit via Gemini
commit:
    cd backend && uv run python -m app.cli.commit

# Push with GitHub auth switching
push:
    bash scripts/push.sh

# Lint check (read-only) — Biome (JS/TS) + custom policies + ruff (Python)
lint: lint-py
    bunx --bun @biomejs/biome check --no-errors-on-unmatched --files-ignore-unknown=true . && bun run lint:policies

# Lint and auto-fix — Biome (JS/TS) + ruff (Python)
lint-fix: lint-py-fix
    bunx --bun @biomejs/biome check --write --no-errors-on-unmatched --files-ignore-unknown=true .

# Format — Biome (JS/TS) + ruff (Python)
format: format-py
    bunx --bun @biomejs/biome format --write .

# Check (read-only) — Biome + ruff lint + ruff format check
check: check-py
    bunx --bun @biomejs/biome check --no-errors-on-unmatched --files-ignore-unknown=true .

# --- Python: ruff (lint + format) and mypy (type check) ----------------------

# Lint Python with ruff (read-only)
lint-py:
    cd backend && uv run ruff check .

# Lint Python and auto-fix safe issues
lint-py-fix:
    cd backend && uv run ruff check --fix .

# Format Python with ruff
format-py:
    cd backend && uv run ruff format .

# Check Python (lint + format check, no writes) — used by `just check`
check-py:
    cd backend && uv run ruff check .
    cd backend && uv run ruff format --check .

# Static type-check with mypy (advisory — does not block `just check`).
# Surfaces pre-existing type tech debt; address incrementally. The leading
# `-` tells just to ignore a non-zero exit so the recipe reports findings
# without failing the build until the legacy backlog is drained.
typecheck:
    -cd backend && uv run mypy

# Full health gate: ruff + biome + mypy (strict). Use this before pushing.
check-all: check typecheck

# Check application architecture with sentrux
sentrux:
    bash scripts/sentrux-check.sh

# Run backend tests
test:
    uv run --project backend pytest backend/tests

# Install all dependencies (frontend + backend)
install:
    bun install
    uv sync --project backend

# Show active tasks from Notion
tasks:
    bun run tasks.ts

# Remove build caches
clean:
    rm -rf frontend/.next
    find . -type d -name __pycache__ -exec rm -rf {} +
