---
# pawrrtal-dy4x
title: Prune irrelevant rules and skills from .claude and .agents
status: completed
type: task
priority: normal
created_at: 2026-05-14T07:17:08Z
updated_at: 2026-05-14T07:19:40Z
---

Remove rules in .claude/rules/ and skills in .claude/skills + .agents/skills that target stacks Pawrrtal does not use (RN, iOS/Android native, Maestro, Figma, Zustand, Firebase, pnpm, Vercel). Pawrrtal stack: Next.js 16 + React 19 + Bun + Biome + FastAPI + Agno + Electron + self-hosted GH runner + Vitest/Playwright/Stagehand/pytest.

## Summary of Changes

Audited project (Pawrrtal): Next.js 16 + React 19 + TypeScript + Tailwind 4 + Bun + Biome frontend; FastAPI + Python 3.13 + Agno + Claude Agent SDK backend; Electron wrapper; self-hosted GH runner CI; Vitest/Playwright/Stagehand/pytest; @octavian-tocan/react-overlay for modals; FastAPI-Users JWT auth; bun workspaces (not pnpm). No React Native, no iOS/Android native, no Maestro, no Figma workflow, no Zustand, no Vercel, no Firebase auth.

### Rules removed (.claude/rules/, 34 files)

**CI — iOS/Android/RN/pnpm-specific (12):**
- ci/bundle-js-into-aar.md
- ci/put-gradle-api-calls-inside-dependencies-block.md
- ci/gradle-cache-key-cng.md
- ci/pnpm10-lifecycle-scripts.md
- ci/shutdown-ios-simulators-after-tests.md
- ci/code-signing-disabled-in-ci.md
- ci/dynamic-ios-simulator-detection.md
- ci/gradle-embed-needs-build-type-attribute.md
- ci/detect-android-sdk-self-hosted-runners.md
- ci/metro-oom-prevention.md
- ci/brownfield-cli-over-xcodebuild.md
- ci/no-xcodeversion-in-xcodegen-spec.md

**Debugging — iOS/Android/RN (3):**
- debugging/native-mount-issue-not-js-render.md
- debugging/fmt-consteval-error-means-stale-pod-cache.md
- debugging/readelf-abi-before-fixing-linker-errors.md

**Entire categories — no longer applicable:**
- e2e/ (all 3 files: Maestro/Android/RN-only)
- figma/ (all 5 files: project uses DESIGN.md as source, no Figma workflow)

**State management — Zustand/Kotlin-specific (3):**
- state-management/zustand-immutable-updates.md
- state-management/zustand-setter-stable-ref.md
- state-management/singleton-before-db.md

**Testing — RN (1):**
- testing/mock-react-native-in-vitest.md

**Monorepo — RN (1):**
- monorepo/vitest-mock-flow-types.md (paths was .no-match anyway)

**Auth — Firebase/Notion-specific (3):**
- auth/never-override-auth-library-internals.md
- auth/use-factory-functions-for-login-strategies.md
- auth/per-agent-auth-isolation.md

**General — pnpm/agentic-stack-specific (3):**
- general/pnpm-only-package-manager.md
- general/pnpm-store-dir-on-external-drive.md
- general/never-hand-edit-lessons.md

**Cursor-vendored — Vercel/other-project-specific (2):**
- cursor-vendored/no-vercel-bypass-secret.mdc
- cursor-vendored/download-banner-padding.mdc

### Rules kept

All other rules (180 .md + 24 .mdc) — covers TypeScript, React, Next.js, FastAPI/Python, Biome, Bun monorepo, Stagehand/Playwright, Vitest, Electron, error handling, auth patterns generally, CI for GH Actions, sentrux, design system, sweep/PR review.

### Skills removed (1)

- setup-matt-pocock-skills (.agents/skills/ + .claude/skills/ symlink) — one-time scaffolding skill; the per-repo Matt Pocock setup (Agent skills block in CLAUDE.md, docs/agents/) is already in place. Note: skills-lock.json entry was reverted by an external mechanism after my edit — left as-is per system signal.
