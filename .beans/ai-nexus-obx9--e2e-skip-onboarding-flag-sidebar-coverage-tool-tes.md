---
# ai-nexus-obx9
title: 'E2E: skip-onboarding flag + sidebar coverage + tool tests + error logging'
status: completed
type: feature
priority: high
created_at: 2026-05-05T14:53:53Z
updated_at: 2026-05-05T16:11:30Z
---

Add ?e2e=skip-onboarding query param to OnboardingFlow, expand sidebar E2E coverage, add web-search tool E2E, fix Claude SDK error_max_turns silent failure, validate GIFs are produced, harden gitignore for build artifacts.

## Summary of Changes

- **Onboarding skip flag** in production code — `frontend/features/onboarding/v2/OnboardingFlow.tsx` exports `E2E_SKIP_ONBOARDING_STORAGE_KEY` and `E2E_SKIP_ONBOARDING_QUERY_PARAM`. Honored via `shouldSkipOnboardingForE2E()` lazy initializer; production users see no behavior change. Fixture's `addInitScript` sets the flag before any page script runs.

- **Claude SDK silent error fix** — `backend/app/core/providers/claude_provider.py` now bumps `max_turns` from 1 to 6 when any tool is enabled (`_TOOL_ENABLED_MAX_TURNS`), preventing the silent `stop_reason='tool_use' subtype='error_max_turns'` panel that appeared when Claude tried to call `exa_search`. Also added `logger.warning` next to every error yield so SDK failures show up in `backend/app.log`.

- **GIF generation actually works** — fixture's `run.gif` was silently broken because Stagehand v3 LOCAL doesn't expose Playwright's tracing API on its V3Context. Replaced trace.zip approach with a periodic-screenshot timer (500ms intervals via `stagehand.context.activePage().screenshot()`) stitched by ffmpeg.

- **Reliable chat send helper** — `frontend/e2e/stagehand/helpers.ts` exports `typeAndSendChatMessage` (Playwright `locator.fill` + `form.requestSubmit()`) and `pollForAssistantReply` (DOM read via `.is-user`/`.is-assistant` classes). Bypasses Stagehand for the deterministic parts, dropping spec runtime from minutes to seconds.

- **5 new specs** — `chat` (multi-turn round-trip, was fixme'd), `onboarding` (4-step wizard, was fixme'd), `add-workspace` (workspace selector, was fixme'd), `sidebar-new-session`, `sidebar-search`, `sidebar-context-menu`, `sidebar-collapse-toggle`, `tool-web-search`. Last one locks the Claude regression fix.

- **gitignore** — added `**/.trace-extract/` and `**/run.gif` for build artifacts. `.stagehand-cache/` remains committed for CI warm cache.

- **README** updated with new spec inventory + `E2E_SKIP_ONBOARDING` workflow.

Final state: 5/5 settings + sidebar + chat green; tool-web-search green (skips soft assertions when Claude infra unavailable). Onboarding/add-workspace specs pass on Gemini when quota is available.
