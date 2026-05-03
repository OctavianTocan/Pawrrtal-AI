**IMPORTANT**: before you do anything else, run the `beans prime` command and heed its output.

# Repository Guidelines

- Repo: https://github.com/OctavianTocan/ai-nexus
- In chat replies, file references must be repo-root relative only (example: `frontend/components/ui/sidebar.tsx:80`); never absolute paths or `~/...`.
- Do not edit files covered by security-focused `CODEOWNERS` rules unless a listed owner explicitly asked for the change or is already reviewing it with you. Treat those paths as restricted surfaces, not drive-by cleanup.

## Project Structure & Architecture Boundaries

- **Frontend (`frontend/`)**: Next.js App Router, TypeScript, Tailwind CSS v4, and shadcn-style UI. Routes live in `frontend/app/`, UI components in `frontend/components/`, feature modules in `frontend/features/`.
- **Backend (`backend/`)**: Python FastAPI application. API routes in `backend/app/api/`, database models in `backend/app/models/`, CRUD operations in `backend/app/crud/`.
- **Docs (`docs/`)**: Project documentation, migration plans, and design specs.
- **Tasks (`.beans/`)**: Markdown-based task tracking. Update the status of `.beans` files as work is completed.
- **Rule**: Always use the `beans` CLI (e.g. `beans create`, `beans update`) to manage `.beans` files. Never create or edit them manually.
- **AI Rules (`.claude/rules/`)**: Most rules are vendored from [github.com/OctavianTocan/claude-rules](https://github.com/OctavianTocan/claude-rules) into `.claude/rules/`; each file uses YAML frontmatter with `paths` globs so rules apply only for matching files. This repo also keeps project-specific rule sets under `.claude/rules/clean-code/` and `.claude/rules/github-actions/`.
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

## Curated Claude rules (AI Nexus)

Highest-signal defaults for this Next.js + FastAPI + Biome + Bun stack; the full `.claude/rules/` tree has additional coverage.

### Debugging & incidents

- `.claude/rules/general/read-data-before-theory.md`
- `.claude/rules/general/diagnose-before-workaround.md`
- `.claude/rules/general/stop-after-two-failed-fixes.md`
- `.claude/rules/debugging/compare-working-vs-broken-before-fixing.md`

### TypeScript

- `.claude/rules/typescript/never-bypass-type-system-with-any-or-unsafe-cast.md`
- `.claude/rules/typescript/explicit-return-types-everywhere.md`
- `.claude/rules/typescript/validate-boundaries.md`
- `.claude/rules/typescript/discriminated-unions.md`
- `.claude/rules/typescript/function-signatures-must-be-honest.md`
- `.claude/rules/typescript/use-direct-named-imports-not-namespace.md`

### React (client UI)

- `.claude/rules/react/avoid-stale-closures-and-mutating-state.md`
- `.claude/rules/react/use-primitive-values-as-effect-dependencies.md`
- `.claude/rules/react/purity-in-memo-and-reducers.md`
- `.claude/rules/react/stable-keys.md`
- `.claude/rules/react/request-id-cancellation.md`
- `.claude/rules/react/portal-escape-overflow.md`

### API & fetch boundaries

- `.claude/rules/api/validate-response-shape-at-boundary.md`
- `.claude/rules/api/abort-controller-per-request.md`
- `.claude/rules/error-handling/check-response-before-parse.md`

### Auth (sessions/tokens)

- `.claude/rules/auth/deduplicate-concurrent-token-refreshes.md`
- `.claude/rules/auth/never-override-auth-library-internals.md`
- `.claude/rules/error-handling/timeout-async-auth.md`

### Errors & async

- `.claude/rules/error-handling/abort-error-is-expected.md`
- `.claude/rules/error-handling/reset-flags-in-finally.md`
- `.claude/rules/error-handling/catch-promise-chains.md`

### Testing

- `.claude/rules/testing/vi-hoisted-for-mock-variables.md`
- `.claude/rules/testing/factory-over-shared-mutable.md`
- `.claude/rules/testing/test-isolation-ephemeral.md`
- `.claude/rules/playwright/web-first-assertions.md`
- `.claude/rules/playwright/role-selectors.md`
- `.claude/rules/playwright/no-networkidle.md`

### Monorepo & Biome

- `.claude/rules/monorepo/single-lockfile-per-workspace.md`
- `.claude/rules/monorepo/biome-version-aware-config.md`
- `.claude/rules/general/biome-2-migration-gotchas.md`

### Git & PRs

- `.claude/rules/git/one-concern-per-pr.md`
- `.claude/rules/git/conventional-commits.md`

### AI review / sweep

- `.claude/rules/sweep/read-type-signatures-before-use.md`
- `.claude/rules/sweep/review-comments-are-patterns.md`

**Ignore** `.claude/rules/general/pnpm-only-package-manager.md` for installs — this repo uses Bun (`just install`).

### TwinMind / thirdear-webapp Cursor rules (vendored)

TwinMind `thirdear-webapp` Cursor rules are vendored under `.cursor/rules/` (repo-root relative). Each file is `.mdc` with YAML frontmatter: `description`, `globs` (and sometimes duplicate `paths`), and `alwaysApply` (when `true`, the rule applies broadly instead of only to glob matches).

A parallel snapshot of the same files lives at `.claude/rules/thirdear-cursor/` for reference and diffing alongside the main claude-rules vendored tree. Those `.mdc` copies are not converted to Claude's usual `name` + `paths` `.md` format; use the standard `.claude/rules/**` files above for Claude path-scoped enforcement.

## Learned User Preferences

- When the user asks to log a technical or architectural decision, capture it in `docs/decisions/` (ADR-style) and tie it to task tracking (e.g. `beans`) when the flow already uses beans.
- When adapting external UI references (screenshots, other products), use AI Nexus naming and the repo theme tokens rather than copying third-party branding or palettes from the reference.
- The user may ask for extremely terse “caveman” explanations when digging into complex technical changes.

## Learned Workspace Facts

- Local dev runs on plain localhost: Next.js on `http://localhost:3001`, FastAPI on `http://localhost:8000`. `dev.ts` (run via `just dev` or `bun run dev`) starts both side-by-side. No HTTPS, no proxy, no special hostnames.
- Frontend → backend cookie auth works because both run on the same host (`localhost`); cookies ignore ports, so `Set-Cookie` from `:8000` is visible to fetches from `:3001` with `credentials: 'include'`. Use `COOKIE_SAMESITE=lax` and `COOKIE_SECURE=false` in dev.

