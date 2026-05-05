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

# Static type-check with mypy (advisory — surfaces tech debt without failing the gate)
typecheck:
    # The leading `-` tells just to ignore a non-zero exit so the recipe
    # reports findings without failing the build until the legacy backlog
    # is drained. Address findings incrementally.
    -cd backend && uv run mypy

# Security scan with bandit (Python). Findings here are real and should fail.
security-py:
    cd backend && uv run bandit -r app -c pyproject.toml --quiet

# Full health gate: ruff + biome + bandit + mypy. Use before pushing.
check-all: check security-py typecheck

# --- Pre-commit hooks --------------------------------------------------------

# Install pre-commit git hooks (run once after cloning the repo)
install-hooks:
    cd backend && uv run pre-commit install --install-hooks

# Update all pre-commit hook versions to their latest release
update-hooks:
    cd backend && uv run pre-commit autoupdate

# Run pre-commit on staged files (mimics what runs on `git commit`)
pre-commit:
    cd backend && uv run pre-commit run

# Run pre-commit across the entire repo (use before opening a PR)
pre-commit-all:
    cd backend && uv run pre-commit run --all-files

# Check application architecture with sentrux
sentrux:
    bash scripts/sentrux-check.sh

# Run backend tests
test:
    uv run --project backend pytest backend/tests

# Playwright E2E suite (frontend/e2e/). Requires backend + frontend dev
# servers to be already running on the standard ports — start them with
# `just dev` in another terminal first. Uses the dev-admin login fixture
# (no UI signup), per the project's API-setup-not-UI rule.
e2e:
    cd frontend && bunx --bun playwright install --with-deps chromium
    cd frontend && bunx --bun playwright test

# --- Electron desktop shell -------------------------------------------------

# Compile the Electron main + preload TypeScript once.
electron-build:
    cd electron && bun run build

# Run the Electron shell against the running Next.js dev server.
# Requires `just dev` in another terminal so the FE is already on :3001.
# The shell waits for the dev server before opening the BrowserWindow,
# so order doesn't matter beyond eventually being up.
electron-dev: electron-build
    cd electron && bun run start:dev

# Build the Next.js standalone bundle the desktop app spawns at runtime.
electron-frontend-build:
    cd frontend && bun run build

# Full production-style run inside Electron (no external dev server):
# build the FE, build the shell, launch it pointing at the spawned
# Next.js standalone server.
electron-prod: electron-frontend-build electron-build
    cd electron && bun run start

# Package the desktop app via electron-builder. Outputs to electron/dist-app/.
# Defaults to the host platform; pass --mac/--win/--linux via electron-builder
# directly if you need a cross-target build.
electron-dist: electron-frontend-build
    cd electron && bun run dist

# --- Browser-use E2E (LLM-driven) -------------------------------------------

# Run the browser-use end-to-end suite. Requires `just dev` already running
# (frontend + backend) and one of OPENAI_API_KEY / ANTHROPIC_API_KEY set so
# the agent has an LLM to drive each step. Tests are slow (10–60s each)
# and cost real money — keep them out of `just check`; run on demand.
browser-use-e2e:
    cd e2e-browser-use && uv sync
    cd e2e-browser-use && uv run pytest -v -m browser_use

# Install all dependencies (frontend + backend) and git hooks
install:
    bun install
    uv sync --project backend
    just install-hooks

# Show active tasks from Notion
tasks:
    bun run tasks.ts

# Remove build caches
clean:
    rm -rf frontend/.next
    find . -type d -name __pycache__ -exec rm -rf {} +
