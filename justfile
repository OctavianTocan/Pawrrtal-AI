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

# Lint check (read-only) with Biome + custom policies
lint:
    bunx --bun @biomejs/biome check --no-errors-on-unmatched --files-ignore-unknown=true . && bun run lint:policies

# Lint and auto-fix with Biome
lint-fix:
    bunx --bun @biomejs/biome check --write --no-errors-on-unmatched --files-ignore-unknown=true .

# Format with Biome
format:
    bunx --bun @biomejs/biome format --write .

# Check with Biome (read-only, no writes)
check:
    bunx --bun @biomejs/biome check --no-errors-on-unmatched --files-ignore-unknown=true .

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
