---
# ai-nexus-hq07
title: Browser-Use E2E test suite (next branch after Electron)
status: todo
type: feature
priority: high
created_at: 2026-05-05T07:06:09Z
updated_at: 2026-05-05T07:06:09Z
---

The user wants a substantial new E2E suite using **browser-use** (https://github.com/browser-use/browser-use), an LLM-driven browser automation framework. This replaces or supplements the Playwright suite at frontend/e2e/ for tests where a natural-language step description is more useful than fine-grained selectors.

**Branch.** New branch \`feat/browser-use-e2e\` from \`development\` (or whatever the current main-line branch is once the Electron work merges).

**Setup.**
- Install browser-use Python package in a new \`e2e-browser-use/\` directory at the repo root (own pyproject.toml managed via uv).
- Configure to use the dev login: hit \`POST /auth/dev-login\` via requests in the test setup, then pass the resulting session cookie into the Browser instance via Playwright's storage state mechanism.
- Default LLM: pick a cheap fast model (gpt-4o-mini or claude-haiku-4-5). Document the env var key.
- New \`just browser-use-e2e\` recipe.

**Initial test catalogue (each is one .py spec):**
- chat_streaming_test.py — open home, type a question, assert response streams in, assert source chips appear.
- create_project_test.py — open sidebar, create project named "Browser-Use Demo", drag a chat into it.
- settings_navigation_test.py — visit each settings tab, assert the heading + at least one form control.
- archived_chats_test.py — archive a chat, navigate to Settings → Archived chats, unarchive it.
- onboarding_personalization_test.py — fill the home-page wizard's identity step, assert it advances to context.
- search_test.py — type into the sidebar search, assert filtered results.
- shift_click_multi_select_test.py — multi-select two chats via shift+click, assert the count badge.

**Architecture notes.**
- browser-use needs an LLM provider. Don't bake the API key into the repo; read from env. The test fixtures should skip cleanly with a clear "set OPENAI_API_KEY (or whatever) to run browser-use tests" message when missing.
- These tests are MUCH slower than Playwright (10–60s per test). Keep them out of the default \`just check\` gate; run them in CI on a nightly cadence.
- Coexists with the existing frontend/e2e/ Playwright suite; don't delete it.

## Todo
- [ ] Wait for the Electron privileged-ops branch to merge
- [ ] New branch feat/browser-use-e2e
- [ ] Scaffold e2e-browser-use/ with uv pyproject.toml
- [ ] Install browser-use, set up config (LLM, browser type, headless mode)
- [ ] Auth fixture: POST /auth/dev-login, capture session cookie, hand to Browser
- [ ] Write the seven initial specs above
- [ ] Add \`just browser-use-e2e\` recipe
- [ ] CI workflow: nightly run on main + on label
- [ ] Document env vars (LLM key, BROWSER_USE_HEADLESS, etc) in .env.example
