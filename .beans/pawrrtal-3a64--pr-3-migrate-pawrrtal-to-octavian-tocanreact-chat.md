---
# pawrrtal-3a64
title: 'PR 3: Migrate pawrrtal to @octavian-tocan/react-chat-composer'
status: completed
type: task
priority: high
created_at: 2026-05-10T21:45:56Z
updated_at: 2026-05-11T00:56:53Z
parent: pawrrtal-f1vm
blocked_by:
    - pawrrtal-f1vm
    - pawrrtal-idpr
    - pawrrtal-k19r
---

Third PR. Flips host imports from features/chat/components/* to the new submodule, rebuilds pawrrtal-specific PlanButton + SafetyModeSelector as thin wrappers, wires onTranscribeAudio to existing useVoiceTranscribe, deletes the obsolete in-tree files. See docs/plans/extract-react-chat-composer.md §9 + §10 PR 3.

## Todo

- [ ] Add @source + @import lines for react-chat-composer to frontend/app/globals.css
- [ ] Rebuild PlanButton as host-local features/chat/components/PlanButton.tsx
- [ ] Rebuild SafetyModeSelector as host-local using ComposerActionSelector primitive
- [ ] Convert ChatModelId to host-local narrow union derived from a PAWRRTAL_MODELS const
- [ ] Flip the 4 host import sites (ChatContainer, ChatView, constants.ts, hooks/use-chat.ts)
- [ ] Wire onTranscribeAudio prop to existing pawrrtal useVoiceTranscribe hook (wrapped as a callback)
- [ ] Delete frontend/features/chat/components/{ChatComposer,ChatComposerControls,ModelSelectorPopover,ChatPromptSuggestions}.tsx
- [ ] Remove composer-related keyframes (composer-placeholder-enter, waveform-scroll) from pawrrtal globals.css (now in package)
- [ ] Verify: app builds, biome passes, Stagehand E2E composer specs green, no visual regression
- [ ] Optionally bump audit script to STRICT_VC=1 in a follow-up bean
- [ ] Open PR with conventional title 'refactor: migrate pawrrtal to @octavian-tocan/react-chat-composer'



## Summary of Changes

PR 3 migration complete. Host now consumes `@octavian-tocan/react-chat-composer` via the submodule workspace dep; deleted the in-tree composer split (`ChatComposer`, `ChatComposerView`, `ChatComposerControls`, `AutoReviewSelector`*, `safety-mode-meta`, `ModelSelectorPopover`*, `ModelRow`, `ReasoningRow`, `ProviderLogo`, `ChatPromptSuggestions`, `model-selector-data`, `use-voice-transcribe`, `use-composer-message`). Rebuilt PlanButton + SafetyModeSelector as host-local thin wrappers and added `useTranscribeAudioCallback` wiring the package's `onTranscribeAudio` to the existing STT proxy. Constants module now owns `ChatModelId` / `ChatReasoningLevel` derived from a host-local `PAWRRTAL_MODELS` const tuple. Globals.css drops composer-placeholder-enter + waveform-scroll keyframes (now in package). `bun run check` green; all chat vitest specs green.
