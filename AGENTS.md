**IMPORTANT**: before you do anything else, run the `beans prime` command and heed its output.

# Repository Guidelines

- Repo: https://github.com/OctavianTocan/ai-nexus
- In chat replies, file references must be repo-root relative only (example: `frontend/components/ui/sidebar.tsx:80`); never absolute paths or `~/...`.
- Do not edit files covered by security-focused `CODEOWNERS` rules unless a listed owner explicitly asked for the change or is already reviewing it with you. Treat those paths as restricted surfaces, not drive-by cleanup.

## Project Structure & Architecture Boundaries

- **Frontend (`frontend/`)**: React SPA built with Vite, TanStack Router, and TailwindCSS. UI components live in `frontend/components/`, feature modules in `frontend/features/`.
- **Backend (`backend/`)**: Python FastAPI application. API routes in `backend/app/api/`, database models in `backend/app/models/`, CRUD operations in `backend/app/crud/`.
- **Docs (`docs/`)**: Project documentation, migration plans, and design specs.
- **Tasks (`.beans/`)**: Markdown-based task tracking. Update the status of `.beans` files as work is completed.
- **Rule**: Always use the `beans` CLI (e.g. `beans create`, `beans update`) to manage `.beans` files. Never create or edit them manually.
- **AI Rules (`.claude/rules/`)**: Strict context and design patterns to follow. Always read and abide by the rules inside `.claude/rules/react/`, `.claude/rules/typescript/`, `.claude/rules/github-actions/`, and `.claude/rules/clean-code/` when modifying or creating new code.
- **Rule**: Frontend code must only communicate with the backend via the established API endpoints (using `useAuthedFetch` or TanStack Query mutations). Do not mix frontend and backend responsibilities.
- **Rule**: UI components should follow the established Craft Agents design language (e.g., `popover-styled` classes, exact radius matching).
- **Rule**: Ensure PascalCase is used for components inside `frontend/features/`.

## Build, Test, and Development Commands

We rely on `just` as our primary task runner for the repository.

- **Start all dev servers**: `just dev` (starts both frontend and backend concurrently).
- **Check (Lint/Format read-only)**: `just check` (runs Biome).
- **Lint & Auto-fix**: `just lint-fix` (runs Biome check with writes).
- **Format**: `just format` (runs Biome format).
- **Install All Dependencies**: `just install` (runs `bun install` for frontend and `uv sync` for backend).
- **Auto-commit**: `just commit` (auto-generates conventional commit).
- **Push**: `just push` (runs push with auth switching).
- **Terminology**:
    - "gate" means a verification command or command set that must be green for the decision you are making.
    - A local dev gate is the fast default loop, usually `bun run typecheck` and `just check` plus any scoped test you actually need.

## Coding Style & Naming Conventions

- **Frontend**: TypeScript (ESM) and React. Prefer strict typing; avoid `any`.
- **Formatting/linting**: Managed by Biome. Never add `@ts-nocheck` and do not add inline lint suppressions by default. Fix root causes first; only keep a suppression when the code is intentionally correct, the rule cannot express that safely, and the comment explains why.
- Do not disable `no-explicit-any`; prefer real types, `unknown`, or a narrow adapter/helper instead.
- Prefer explicit inheritance/composition or helper composition so TypeScript can typecheck.
- Keep files concise; extract helpers instead of "V2" copies. Aim to keep files under ~700 LOC. Split/refactor when it improves clarity or testability.
- **Written English**: Use American spelling and grammar in code, comments, docs, and UI strings (e.g. "color" not "colour", "behavior" not "behaviour", "analyze" not "analyse").
- **Preserve Documentation**: NEVER remove existing docstrings, JSDoc comments, or explanatory comments when modifying code. Only remove documentation if the code it documents is being deleted, or update it if your changes make it inaccurate. See `.claude/rules/clean-code/preserve-documentation.md` for detailed rules.

## Commit & Pull Request Guidelines

- Use `$pr-to-branch` skill for PR creation and analysis when available.
- Create commits with clear, action-oriented messages (e.g., `feat(sidebar): add rename functionality`).
- Group related changes; avoid bundling unrelated refactors.
- PRs should be small, review-friendly slices (e.g., "Sidebar Craft Parity Round 2"). Do not bundle massive rewrites with unrelated visual tweaks.
- When landing or merging any PR, ensure the working tree is clean and CI gates pass.

## Git Notes

- Agents MUST NOT create or push merge commits on `main` or `development`. If the target branch has advanced, rebase local commits onto the latest `origin/development` before pushing.
- Bulk PR close/reopen safety: if a close action would affect more than 5 PRs, first ask for explicit user confirmation with the exact PR count and target scope/query.

## Collaboration / Safety Notes

- **Multi-agent safety:** do **not** create/apply/drop `git stash` entries unless explicitly requested. Assume other agents may be working; keep unrelated WIP untouched and avoid cross-cutting state changes.
- **Multi-agent safety:** when the user says "push", you may `git pull --rebase` to integrate latest changes (never discard other agents' work). When the user says "commit", scope to your changes only.
- **Multi-agent safety:** prefer grouped `commit` / `pull --rebase` / `push` cycles for related work instead of many tiny syncs.
- **Multi-agent safety:** do **not** create/remove/modify `git worktree` checkouts unless explicitly requested.
- **Multi-agent safety:** do **not** switch branches / check out a different branch unless explicitly requested.
- **Multi-agent safety:** running multiple agents is OK as long as each agent has its own session.
- **Multi-agent safety:** when you see unrecognized files, keep going; focus on your changes and commit only those.
- Lint/format churn:
    - If staged+unstaged diffs are formatting-only, auto-resolve without asking.
    - If commit/push already requested, auto-stage and include formatting-only follow-ups in the same commit.
    - Only ask when changes are semantic (logic/data/behavior).
- **Multi-agent safety:** focus reports on your edits; avoid guard-rail disclaimers unless truly blocked; when multiple agents touch the same file, continue if safe; end with a brief “other files present” note only if relevant.
- Bug investigations: read source code of relevant dependencies and all related local code before concluding; aim for high-confidence root cause.
- Code style: add brief comments for tricky logic.
- **GitHub Actions Rules (`.claude/rules/github-actions/`)**: Strict context and design patterns to follow when creating or modifying CI/CD workflows and actions.
- **Clean Code Rules (`.claude/rules/clean-code/`)**: Universal rules for function design, naming conventions, named constants, Python logging/exception narrowing, and code structure. Your generated code must adhere to these principles (KISS, DRY, single-responsibility, meaningful naming).
- **React Rules (`.claude/rules/react/`)**: Component patterns including callback prop naming (`on*` for props, `handle*` for implementations), aria-hidden consistency on decorative icons, focus management, state guards, StrictMode-safe render patterns (no mutable closures in JSX), and stable content-derived React keys.
- **TypeScript Rules (`.claude/rules/typescript/`)**: Explicit return types on every function, TSDoc on exports, JSDoc placement (directly above the declaration), parameter limits (max 3 positional, group into objects beyond that), literal union types for constrained string fields, and environment variable conventions.

## Learned User Preferences

- When the user asks to log a technical or architectural decision, capture it in `docs/decisions/` (ADR-style) and tie it to task tracking (e.g. `beans`) when the flow already uses beans.
- When adapting external UI references (screenshots, other products), use AI Nexus naming and the repo theme tokens rather than copying third-party branding or palettes from the reference.
- The user may ask for extremely terse “caveman” explanations when digging into complex technical changes.

## Learned Workspace Facts

- Local Portless dev serves the Next.js app at `https://app.nexus-ai.localhost` and the browser should call the API at `https://api.app.nexus-ai.localhost` (not `http://localhost:8000`) so an HTTPS page does not hit mixed-content blocking.
- Root `portless.json` maps only Bun/npm workspace packages (e.g. `frontend`); FastAPI is not listed there—the API is started alongside (e.g. `dev.ts` with `bunx portless api.app.nexus-ai …`).
- Accepted Portless + hybrid frontend/API setup is documented in `docs/decisions/portless-local-development.md`.
- `dev.ts` may wait until HTTPS responds through Portless (e.g. curl probe) before auto-opening the browser, to avoid Portless’s “no app registered” stub during registration.
- Safari over Portless HTTPS is stricter than Chrome about cross-site cookies: `fetch` from `app.nexus-ai.localhost` to `api.app.nexus-ai.localhost` can yield HTTP 204 on dev-login while the session cookie still does not stick for follow-up navigation; same-origin auth handoffs through the Next.js app origin avoid that failure mode.
