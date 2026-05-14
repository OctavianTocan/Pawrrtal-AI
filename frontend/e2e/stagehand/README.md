# Stagehand AI E2E Suite

LLM-driven end-to-end tests for Pawrrtal, using [Stagehand v3](https://docs.stagehand.dev/v3) in `env: "LOCAL"` mode (no Browserbase account required).

## Why a separate suite?

The deterministic suite at `frontend/e2e/*.spec.ts` runs in seconds, costs nothing, and gates `just check`. This AI suite runs in **minutes**, costs real money per LLM call, and is opt-in via `just stagehand-e2e`. Each spec uses `act` / `extract` / `observe` against natural-language descriptions instead of CSS selectors, so checks survive copy and markup changes that would break a Playwright `getByRole`.

For the full design rationale and the (failed) browser-use experiment that preceded this, see the ADR: `frontend/content/docs/handbook/decisions/2026-05-05-stagehand-over-browser-use-for-ai-e2e.md`.

## Prerequisites

1. `just dev` running in another terminal (Next on `:3001`, FastAPI on `:8000`).
2. One of these env vars set in `backend/.env` (Google takes priority, then OpenAI, then Anthropic):
   - `GOOGLE_API_KEY` → `google/gemini-3-flash-preview` (default — Tier 1 caps Pro Preview at 250 RPD, Flash Preview is ~10k RPD + ~2-3× faster). Override with `GOOGLE_MODEL=gemini-3.1-pro-preview` if you've upgraded billing.
   - `OPENAI_API_KEY` → `openai/gpt-5.4` (override with `OPENAI_MODEL=gpt-5.4-mini` for the smaller fallback)
   - `ANTHROPIC_API_KEY` → `anthropic/claude-haiku-4-5`
3. `ffmpeg` on PATH (optional, only for GIF artifact generation): `brew install ffmpeg`.

## Running

```bash
just stagehand-e2e             # headed by default — watch the agent
STAGEHAND_HEADLESS=1 just stagehand-e2e   # CI/headless
```

## Capabilities

| Spec | Pattern shown | Purpose |
| --- | --- | --- |
| `settings-nav.stagehand.spec.ts` | `observe` → `act` (cached action) + Zod object `extract` | Single-tab nav + assert heading |
| `settings-rail.stagehand.spec.ts` | Zod array `extract` (one LLM call for all nav items) | Replaces N brittle `getByRole` calls |
| `archived-chats.stagehand.spec.ts` | Discriminated-union `extract` (`'empty' \| 'populated'` + count) | Validates either-state UI without hard-coding either branch |
| `chat.stagehand.spec.ts` | Multi-turn round-trip with poll-extract loop, `%variables%` in `act`, message-action `observe` | Proves chat actually works end-to-end |
| `onboarding.stagehand.spec.ts` | 4-step wizard walk + per-spec `addInitScript` to override the global skip flag | Proves the personalization wizard is fully traversable |
| `add-workspace.stagehand.spec.ts` | Workspace-selector dropdown → 3-step modal with folder-picker assert | Proves event-driven OnboardingModal opens via the dropdown |
| `sidebar-new-session.stagehand.spec.ts` | Click "New session" → send → poll for reply → assert sidebar updated | Catches "new conversations don't appear in the sidebar" regressions |
| `sidebar-search.stagehand.spec.ts` | Type into search → assert filtered count → clear → assert restored | Proves the conversation search input is wired |
| `sidebar-context-menu.stagehand.spec.ts` | Right-click row → extract menu items → assert Rename + Delete present | Locks the canonical row-action set without testing every label |
| `sidebar-collapse-toggle.stagehand.spec.ts` | Click sidebar trigger → assert search visibility flips → repeat | Catches sidebar-collapse regressions |
| `tool-web-search.stagehand.spec.ts` | Switch to Claude → send a search prompt → assert no `error_max_turns` panel | Locks the fix for the silent Claude SDK tool-use regression |

## How the cache + self-heal work

Stagehand persists every resolved Playwright action to `.stagehand-cache/` keyed on `(instruction, accessibility tree, model)`. A second run with the same DOM gets a HIT and replays the cached selector — **0 LLM calls, ~50ms**. If the page changes and the cached selector fails, Stagehand catches the error, re-invokes the LLM, gets a new selector, and **transparently replaces the cache entry**. Tests stay green; the cache heals itself.

`%variables%` (e.g. `act("type %email% into the field", { variables: { email: ... } })`) keep the cache key stable across many input values — type 1000 different emails, hit the cache once.

The cache directory is committed to git so CI gets the warm cache too.

## Writing a spec

```ts
import { z } from 'zod';
import { expect, test } from './fixtures';

test('does the thing', async ({ stagehand, navigateToApp }) => {
  await navigateToApp('/some-route');

  // Plan-then-act: cache the action so the LLM doesn't re-plan on retry.
  const [open] = await stagehand.observe("Click the 'Open' button");
  if (open) await stagehand.act(open);
  else await stagehand.act("Click the 'Open' button"); // observe-fallback

  const { title } = await stagehand.extract(
    'Read the H1 title currently visible',
    z.object({ title: z.string() })
  );
  expect(title).toContain('Expected');
});
```

Project rules (`.claude/rules/stagehand/stagehand-v3-typescript-patterns.md`):

- Keep `act` strings **atomic and specific** — `"Click the sign in button"`, not `"Sign in to the website"`.
- Prefer `observe` + cached action over raw `act` when the DOM might change between plan and execution.
- Always include a Zod schema on `extract` so the result is validated.
- For text input, use `%variables%` in the `act` instruction — never inline the runtime value.
- Stagehand's wrapped `Page` strips some Playwright APIs (`keyboard.press`, `waitForResponse`). Route keystrokes through `act("press Escape")`; `page.waitForTimeout` and `page.goto` still work.

## Auth

`fixtures.ts` hits `POST /auth/dev-login` on the FastAPI backend, captures the resulting `session_token` cookie, and injects it into Stagehand's BrowserContext **before** the spec navigates — per the project's API-setup-not-UI rule. Specs always start signed in as the dev admin.

## Onboarding suppression for E2E

The v2 `OnboardingFlow` modal at `frontend/features/onboarding/v2/OnboardingFlow.tsx` is mounted with `initialOpen=true` in `components/app-layout.tsx`, so production users see it on every visit to `/`. For E2E the fixture sets `localStorage['pawrrtal:e2e-skip-onboarding'] = '1'` via `addInitScript` BEFORE any page script runs — the gate inside `OnboardingFlow.tsx` reads this lazily inside its `useState` initializer, so the dialog hydrates closed and never flashes onto the page.

Two ways to opt out (i.e. force the wizard open, useful when testing the wizard itself):

- **Per-spec**: re-run `addInitScript` with the value `'0'` after the fixture (see `onboarding.stagehand.spec.ts` for the canonical example).
- **Manual debugging**: visit any URL with `?e2e_skip_onboarding=1` (or `=0` to opt out).

The flag is production-side code with zero runtime cost outside test mode — `shouldSkipOnboardingForE2E` short-circuits to `false` whenever the localStorage entry is absent. No env var, no build-time switch.

## Debug artifacts

Every run writes the following to `frontend/test-results/<test>/`:

- **`trace.zip`** — Playwright trace with per-step DOM snapshots, network log, console output. Open with `bunx playwright show-trace test-results/<test>/trace.zip`.
- **`run.gif`** — Auto-generated from the trace's per-step screenshots (one frame per Stagehand action, 2 fps loop, 720px wide). Pasteable into PR descriptions and Slack. Requires `ffmpeg` on PATH; silently skipped otherwise.
- **HTML report** at `frontend/playwright-report/index.html` (open with `bunx playwright show-report`) — bundles the trace, screenshots, and the GIF as test attachments.

Stagehand also dumps every LLM request, response, token count, and observe/extract result to stdout (`verbose: 2`).

## CI

The suite runs on PRs that touch frontend code via `.github/workflows/stagehand-e2e.yml`. The workflow:

1. Restores the `.stagehand-cache/` directory from the GitHub Actions cache (keyed on the cache file hashes).
2. Runs `just stagehand-e2e` in headless mode.
3. Uploads `playwright-report/`, `test-results/`, and any generated `run.gif` files as workflow artifacts.
4. Saves the (potentially extended) `.stagehand-cache/` back to the action cache so future runs skip more LLM calls.

Required GitHub Actions secrets: at least one of `OPENAI_API_KEY`, `GOOGLE_API_KEY`, `ANTHROPIC_API_KEY`.
