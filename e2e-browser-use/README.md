# AI Nexus — browser-use E2E suite

LLM-driven end-to-end tests for the AI Nexus web app. Uses
[browser-use](https://github.com/browser-use/browser-use) so each spec
reads like a paragraph of natural-language instructions instead of a
grid of CSS selectors.

Coexists with the existing [`frontend/e2e/`](../frontend/e2e/)
Playwright suite — different tools for different jobs:

| Suite | When |
| --- | --- |
| `frontend/e2e/` (Playwright) | Fast deterministic regression tests on stable selectors. Runs in CI on every PR. |
| `e2e-browser-use/` (this) | Resilient flow-level tests that survive UI churn. Runs nightly + on demand because each test costs LLM tokens. |

## Quick start

1. Bring the app up locally:

   ```bash
   just dev   # starts FastAPI on :8000 + Next.js on :3001
   ```

2. Set an LLM key in your shell or `.env`:

   ```bash
   export OPENAI_API_KEY=sk-…       # cheapest (gpt-4o-mini)
   # or
   export ANTHROPIC_API_KEY=sk-ant-… # fallback (claude-haiku-4-5)
   ```

3. Run the suite:

   ```bash
   just browser-use-e2e
   ```

   Watch the agent drive Chrome live by setting
   `BROWSER_USE_HEADLESS=0`.

If neither LLM key is set, every test is auto-skipped with an
actionable message.

## How it authenticates

The suite hits `POST /auth/dev-login` once per session via `httpx`,
captures the resulting `session_token` cookie, and writes a
Playwright-format `storage_state.json`. Every `BrowserSession`
launches with that file pre-loaded, so the page renders already
signed in. Per the project's API-setup-not-UI rule — no clicking
through a login form per test.

The `dev-login` endpoint is gated on `ENV != prod`, so this works in
local dev and CI but is automatically inert in production.

## Test catalogue

| Spec | What it asserts |
| --- | --- |
| `test_chat_streaming.py` | Sending a message streams a non-empty assistant reply. |
| `test_create_project.py` | The Projects + button opens the name modal; submitting adds a row. |
| `test_settings_navigation.py` | Every settings nav item renders its expected `h1`. |
| `test_archived_chats.py` | Archive a chat from the sidebar, unarchive it from settings. |
| `test_onboarding_personalization.py` | The home wizard's identity step accepts input + advances. |
| `test_search.py` | Sidebar search filters the conversation list. |
| `test_logout.py` | Log out via the user menu redirects to `/login`. |

A spec that needs fixture data (existing chats, etc.) `pytest.skip()`s
cleanly with an explanation when the test account is empty —
deterministic infrastructure isn't worth the complexity for an
opt-in nightly suite.

## Architecture

```
e2e-browser-use/
├── pyproject.toml       # uv-managed; only dep is browser-use + pytest
├── tests/
│   ├── conftest.py      # storage_state fixture, llm fixture, agent_factory
│   └── test_*.py        # one file per flow
└── README.md
```

The `agent_factory` fixture in `conftest.py` is the only place LLM
plumbing lives — each spec calls
`await agent_factory("Open …, click …, …").run()` and asserts on
`result.final_result()` / `result.urls()` / `result.is_successful()`.

## Adding a new spec

1. Pick a user-visible flow.
2. Write the test as natural-language instructions to the agent.
3. Assert via the agent's structured final answer (`"return 'ok' or
   'failed'"`) plus a backup URL containment check.
4. If the flow needs fixture data, `pytest.skip()` cleanly when it's
   missing rather than failing.

Don't reach for fine-grained DOM assertions — that's what the
Playwright suite is for. Browser-use shines when the flow description
is more stable than the DOM around it.

## Caveats

- Each test takes 10–60 seconds. Don't add this to `just check`.
- LLM costs: ~$0.05–0.20 per full suite run with `gpt-4o-mini`.
- browser-use 0.12+ is Chrome-only (Firefox/WebKit dropped). The
  suite locally uses whatever Chromium the system already has;
  `playwright install chromium` isn't required.
- The agent occasionally takes a different path through the UI than
  you'd expect (e.g. uses keyboard nav instead of clicks). That's by
  design — the test passes as long as the *outcome* matches.
