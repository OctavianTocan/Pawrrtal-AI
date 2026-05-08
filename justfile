# List available recipes
default:
    @just --list

# Start frontend (Next.js) and backend (FastAPI) dev servers
dev:
    bun run dev.ts

# Same as `just dev`, but force the Telegram bot to run in polling mode.
# Use this when iterating on the Telegram channel locally so getUpdates
# stays active even if a stale prod webhook is registered against the
# bot token. Requires TELEGRAM_BOT_TOKEN + TELEGRAM_BOT_USERNAME in
# backend/.env.
dev-telegram:
    TELEGRAM_MODE=polling bun run dev.ts

# Auto-generate conventional commit via Gemini
commit:
    cd backend && uv run python -m app.cli.commit

# Push to remote
push:
    git push

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

# TSDoc coverage audit — report exported declarations missing JSDoc comments
# Usage: just check-docs [path-prefix]  e.g. just check-docs frontend/lib
check-docs *ARGS:
    bun run scripts/check-docs.ts {{ARGS}}

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

# One-shot dev: spin up the Next.js dev server AND launch Electron in
# a single terminal. Best for desktop-only iteration where you don't
# need the backend running. For full-stack dev, run `just dev` and
# `just electron-dev` in two terminals instead.
electron-dev-all: electron-build
    cd electron && bun run dev:all

# Full-stack one-shot: backend + frontend + Electron in a single
# terminal. Spawns the root dev orchestrator (`bun run dev.ts`),
# waits for :3001 to come up, then launches the Electron shell. Use
# this for full-stack desktop iteration when you don't want to juggle
# multiple terminals. Ctrl-C tears the whole stack down.
electron-dev-full: electron-build
    cd electron && bun run dev:all:full

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

# --- Stagehand E2E (LLM-driven, lives under frontend/e2e/stagehand) --------

# Run the Stagehand AI-driven end-to-end suite. Requires `just dev` already
# running (frontend + backend) and one of OPENAI_API_KEY / ANTHROPIC_API_KEY
# / GOOGLE_API_KEY set so Stagehand has an LLM to drive `act` / `extract`.
# Tests are slow (10–60s each) and cost real money — keep them out of
# `just check`; run on demand.
stagehand-e2e:
    cd frontend && bunx --bun playwright install --with-deps chromium
    cd frontend && bun run e2e:stagehand

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

# --- Frontend stack spikes (spike/frontend-alternatives branch) -------------

# Each `spike-NN` recipe boots the FastAPI backend on :8000 AND the
# matching spike's Vite/SvelteKit dev server in parallel via a single
# orchestrator (`spikes/dev.ts`).  First run does `pnpm install` for the
# spike automatically.  Ctrl-C tears the whole stack down cleanly.
#
# CORS is widened on the fly so the spike's localhost port is allowed
# without editing `backend/.env`.  Backend URL is passed to the spike
# via VITE_BACKEND_URL so no hardcoded URLs leak into the spike source.

# Spike 01 — React 19 + Vite (no router baseline). FE on :5173.
spike-01:
    bun run spikes/dev.ts 01-react-vite 5173

# Spike 02 — React 19 + Vite + TanStack Router. FE on :5174.
spike-02:
    bun run spikes/dev.ts 02-react-vite-tanstack 5174

# Spike 03 — SvelteKit + Svelte 5 runes. FE on :5175.
spike-03:
    bun run spikes/dev.ts 03-sveltekit 5175

# Spike 04 — Solid.js + Vite. FE on :5176.
spike-04:
    bun run spikes/dev.ts 04-solid 5176
