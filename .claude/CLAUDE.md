# AI Nexus — Claude Code Guide

## Stack
- **Frontend**: Next.js 15 (App Router), TypeScript, Tailwind CSS v4, shadcn/ui, Biome (linting + formatting), Bun
- **Backend**: Python, FastAPI, SQLAlchemy (async), Alembic migrations, Agno (AI sessions), FastAPI-Users
- **Monorepo**: top-level `justfile` for orchestration

## Commands
```bash
# Frontend
cd frontend && bun run dev        # dev server
cd frontend && bun run build      # production build
cd frontend && bun run check      # biome lint + format check
cd frontend && bun run format     # biome format (write)
cd frontend && bun run lint       # biome lint (write)

# Backend
cd backend && uv run uvicorn app.main:app --reload   # dev server
cd backend && uv run alembic upgrade head            # run migrations
cd backend && uv run alembic revision --autogenerate -m "desc"  # new migration

# Root
just dev     # starts both frontend + backend
```

## Code Style
- **TypeScript**: strict mode, explicit return types on all exports, TSDoc on all exported interfaces/props
- **React**: no default exports for non-page components (named exports only); extract pure functions outside components
- **Biome**: enforced — run `bun run check` before committing
- **Python**: type hints on all functions, docstrings on all classes and public functions

## Architecture
- Feature folders under `frontend/features/` own their container + view + hooks
- Presentational components go in `frontend/components/`
- API endpoints in `backend/app/api/` — one file per domain
- DB models in `backend/app/models.py`, schemas in `backend/app/schemas.py`
- Mutations always go through React Query (`@tanstack/react-query`)

## Rules
Claude Code rules live in `.claude/rules/`. They fire automatically based on file path globs. Every rule has a `Verify` question — use it before committing.

## Stagehand browser automation (MCP + docs)

- **Documentation index:** https://docs.stagehand.dev/llms.txt — fetch this first to discover doc pages before deeper exploration.
- **Project MCP servers** (see `.mcp.json` and `config/mcporter.json`): **stagehand-docs** (`https://docs.stagehand.dev/mcp`), **context7** (`npx -y @upstash/context7-mcp`, [repo](https://github.com/upstash/context7)), **deepwiki** (`https://mcp.deepwiki.com/mcp`, [site](https://mcp.deepwiki.com/)).
- **Claude rules:** `.claude/rules/stagehand/stagehand-documentation-and-mcp.md` (session-wide doc/MCP workflow) and `.claude/rules/stagehand/stagehand-v3-typescript-patterns.md` (path-scoped API patterns for `**/*stagehand*`, `**/e2e/**`, `**/playwright/**`).

## Git
- Branch from `v1.1` for v1.2 features, from `v1.2` for v1.3
- Commit with conventional commits: `feat:`, `fix:`, `refactor:`, `chore:`
- Never commit broken builds
