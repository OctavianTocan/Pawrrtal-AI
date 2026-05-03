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

## Git
- Branch from `v1.1` for v1.2 features, from `v1.2` for v1.3
- Commit with conventional commits: `feat:`, `fix:`, `refactor:`, `chore:`
- Never commit broken builds
