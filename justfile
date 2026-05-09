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

# --- Desktop shell (zero-native) --------------------------------------------
# Requires: Zig 0.16+, `npm install -g zero-native`
# Setup:    git clone https://github.com/vercel-labs/zero-native third_party/zero-native

# Compile the Zig shell. Run this after any changes to desktop/src/.
desktop-build:
    cd desktop && zig build

# Run the zero-native dev server against the already-running dev servers.
# Requires `just dev` in another terminal so :3001 and :8000 are already up.
desktop-dev: desktop-build
    cd desktop && zero-native dev --manifest app.zon --binary zig-out/bin/ai-nexus

# Full-stack one-shot: starts the dev servers, waits for :3001, then opens
# the zero-native desktop shell. Ctrl-C tears the whole stack down.
desktop-dev-full:
    bun run dev.ts & \
    until curl -sf http://localhost:3001 > /dev/null 2>&1; do sleep 1; done && \
    cd desktop && zero-native dev --manifest app.zon --binary zig-out/bin/ai-nexus

# Build the Next.js static export for production packaging.
desktop-frontend-build:
    cd frontend && bun run build

# Full production-style run: build frontend export + Zig shell + run.
desktop-prod: desktop-frontend-build desktop-build
    cd desktop && zig build run

# Package the desktop app via zero-native. Outputs to desktop/zig-out/package/.
# Defaults to the host platform; pass -Dpackage-target=macos|linux|windows to override.
desktop-package: desktop-frontend-build desktop-build
    cd desktop && zig build package

# Run the Zig unit tests for the desktop shell.
desktop-test:
    cd desktop && zig build test

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
