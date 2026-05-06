# ADR: Stagehand v3 (LOCAL) over browser-use 0.12.6 for the AI-driven E2E suite

- **Date:** 2026-05-05
- **Status:** Accepted
- **Owners:** OctavianTocan
- **Tracking:** none — opportunistic spike turned into a real decision

## Context

We wanted an AI-driven E2E suite that could exercise the AI Nexus
frontend against natural-language descriptions ("click the Appearance
nav item, read the heading") rather than brittle CSS selectors. The
goal was a complement to the deterministic Playwright suite, not a
replacement.

We initially scaffolded a Python suite at `e2e-browser-use/` using
[browser-use](https://github.com/browser-use/browser-use) 0.12.6,
backed by `pytest-asyncio`, with a dev-admin cookie injected via the
existing `POST /auth/dev-login` endpoint per the project's
api-setup-not-UI rule.

## What broke

The browser launched cleanly, the dev-login cookie loaded, the agent
registered the task, then the **first agent step hung forever** for
every LLM provider we tried:

| LLM | Provider | First-call result |
| --- | --- | --- |
| GLM-5V-Turbo | Z.AI | Hang (paid-tier required) |
| Gemini 2.0 Flash | Google | Hang, TCP `CLOSE_WAIT` |
| Gemini 3 Flash Preview | Google | Hang, TCP `CLOSE_WAIT` |
| Gemini 3.1 Pro Preview | Google | Hang, TCP `CLOSE_WAIT` |
| GPT-5.4-mini-2026-03-17 | OpenAI | Hang, TCP `CLOSE_WAIT` |

Smoke-check calls (1-token "Reply OK") returned in <2 seconds against
every provider — proves credentials, network, and SDKs were fine.

`lsof -nP -p <pytest-pid>` consistently showed the LLM HTTPS socket
moving from `ESTABLISHED` → `CLOSE_WAIT` (server closed, Python
client never noticed) within 30s–10min depending on provider. browser-
use's HTTP client retries silently on rejection, so no error ever
surfaced in the agent log.

Conclusion: browser-use 0.12.6 sends a structured-output payload
(multimodal + function-calling + JSON schema) that modern provider
endpoints reject server-side. The bug is in browser-use, not the
LLMs.

## What we tried before pivoting

- 5 different LLMs across 3 providers
- Headed vs headless Chrome
- Chrome stable vs Chrome Beta vs Chromium-for-Testing
- Custom `executable_path`, `user_data_dir=None`, `keep_alive=True`,
  fresh profile dirs, the canonical 4-line docs example
- `use_vision=False` (no screenshots)
- 90s, 300s, 540s `llm_timeout` values
- Browser-use's bundled Chromium installer (`uvx browser-use install`)
- Switching macOS Chrome variants

None of these produced a working agent step. Total time sunk: ~2.5
hours.

## Decision

Replace `e2e-browser-use/` (Python, browser-use 0.12.6) with
**Stagehand v3 in `env: "LOCAL"` mode** under `frontend/e2e/stagehand/`
(TypeScript, Playwright-driven). Stagehand uses Vercel AI SDK's
schema serialization which is accepted by every modern provider
without modification. First spec ran green in **6.1 seconds**.

### Why Stagehand TS, not Stagehand Python

Stagehand Python v3 is a thin client to the Browserbase service — it
requires `BROWSERBASE_API_KEY` + `BROWSERBASE_PROJECT_ID` even for
"local" browsers (the `act` / `extract` / `observe` calls go to
Browserbase's API). The TypeScript SDK is the only one with a true
fully-local mode (`new Stagehand({ env: "LOCAL" })`).

We already have a Playwright TS setup in `frontend/e2e/`, so adding
Stagehand specs alongside is natural. The deterministic suite stays
on `bun run e2e`; the AI suite is opt-in via `bun run e2e:stagehand`
or `just stagehand-e2e`.

### Suite layout

```
frontend/
├── e2e/
│   ├── *.spec.ts                ← deterministic Playwright
│   ├── fixtures.ts              ← dev-login fixture for Playwright
│   └── stagehand/
│       ├── fixtures.ts          ← dev-login + Stagehand init
│       ├── *.stagehand.spec.ts  ← AI specs
│       └── README.md
├── playwright.config.ts          ← deterministic suite, gates `just check`
└── playwright.stagehand.config.ts ← AI suite, opt-in only
```

## Consequences

**Pros:**
- Works first try against OpenAI, Anthropic, and Google models.
- Stays in TypeScript next to the existing Playwright suite — no
  cross-language fixture duplication.
- Stagehand's `observe` + cached `act` pattern is more robust to DOM
  drift than browser-use's plan-as-you-go agent loop.
- 266 MB of Python deps deleted from the repo.

**Cons / open questions:**
- Stagehand TS v3 is still relatively young (3.3.0 at time of writing);
  expect breaking changes between minor versions until they stabilize
  the API.
- Each `act` / `extract` round-trips to an LLM (~2-10 s); a chained
  spec can take 30-60 s. Not gated on `just check`; run on demand.
- Stagehand drives a raw CDP page that does NOT honor Playwright's
  `baseURL` config — every `page.goto()` must pass an absolute URL.
- AI extraction is grounded — assertions must match what the page
  actually says, not what the spec author assumed (we hit this
  immediately: the "Appearance" nav opens a section with H1 "Theme",
  not "Appearance").

## Reverse-engineering aid

If a future contributor sees browser-use working in a tutorial and
wants to retry it for ai-nexus, the diagnostic checklist is:

1. Run the suite with `BROWSER_USE_LOGGING_LEVEL=debug`.
2. After "Starting a browser-use agent" log line, wait 30s.
3. `lsof -nP -p $(pgrep -f pytest)` — if the LLM socket is in
   `CLOSE_WAIT`, it's the same payload bug we hit. Bail.

## References

- [Stagehand v3 docs](https://docs.stagehand.dev/v3)
- [browser-use GitHub](https://github.com/browser-use/browser-use)
- `frontend/e2e/stagehand/README.md` — how to run + write new specs
- `.claude/rules/stagehand/stagehand-v3-typescript-patterns.md` — API
  patterns to follow when authoring specs
- Memory: `decision_e2e_ai_suite_stagehand.md`,
  `feedback_browser_use_close_wait.md`
