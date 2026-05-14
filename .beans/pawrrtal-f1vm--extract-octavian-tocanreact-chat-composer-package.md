---
# pawrrtal-f1vm
title: Extract @octavian-tocan/react-chat-composer package
status: completed
type: epic
priority: high
created_at: 2026-05-10T21:45:31Z
updated_at: 2026-05-11T04:31:11Z
---

Lift the chat composer surface (ChatComposer, ChatComposerControls, ModelSelectorPopover, ChatPromptSuggestions) out of frontend/features/chat/components/ into a self-contained, npm-publishable React package modelled on @octavian-tocan/react-overlay. Full plan: docs/plans/extract-react-chat-composer.md. Styling ADR: frontend/content/docs/handbook/decisions/2026-05-10-react-chat-composer-styling.md. Three sequential PRs on branch feat/extract-react-chat-composer.

## Todo

- [x] PR 1: audit script + View/Container conversion in-place (pawrrtal-c1mf)
- [x] PR 2: scaffold @octavian-tocan/react-chat-composer submodule (pawrrtal-idpr) + vendor runtime (pawrrtal-k19r)
- [x] PR 3: migrate pawrrtal host imports to the package (pawrrtal-3a64)

## Summary of Changes

Single PR #166 absorbed all three planned PRs + the vendor follow-up. Submodule `@octavian-tocan/react-chat-composer` ships at main `0b076cc` with full v0.1.0 feature surface; host imports flipped, in-tree composer files deleted, ConnectAppsStrip preserved, PlanButton + SafetyModeSelector rebuilt as host-local wrappers consuming the package's ComposerActionSelector primitive, useTranscribeAudioCallback wires onTranscribeAudio to the existing pawrrtal STT proxy.

Two post-migration host-side patches landed on the same branch:
- 8179260 — submodule fix `80b0782` wrapping ChatComposerView in TooltipProvider so Radix tooltips don't crash without a consumer-provided ancestor
- 6980261 — globals.css token bridge forwarding pawrrtal palette to chat-* tokens so the composer inherits the Mistral cream surface

PR 3's deferrals: Stagehand E2E specs not re-run this session; STRICT_VC=1 audit-script promotion is an optional future bean.
