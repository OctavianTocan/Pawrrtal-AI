---
# pawrrtal-idpr
title: 'PR 2: Scaffold @octavian-tocan/react-chat-composer submodule'
status: completed
type: task
priority: high
created_at: 2026-05-10T21:45:50Z
updated_at: 2026-05-10T22:12:06Z
parent: pawrrtal-f1vm
blocked_by:
    - pawrrtal-f1vm
    - pawrrtal-c1mf
---

Second PR. Creates the OctavianTocan/react-chat-composer GitHub repo (public), adds it as a submodule under frontend/lib/react-chat-composer/, scaffolds from the react-overlay template, and vendors all the dependencies the composer needs. Host repo still imports from features/chat/ — package is built but unused. See docs/plans/extract-react-chat-composer.md §10 PR 2.

## Todo

- [x] gh repo create OctavianTocan/react-chat-composer --public
- [x] Initial submodule commit: scaffold from react-overlay (tsup, vitest, semantic-release, eslint, prettier configs). Storybook + lost-pixel deferred to follow-up.
- [ ] Copy + adapt 5 AI Elements pieces into src/prompt-input/
- [ ] Reimplement minimal Button + Tooltip wrapper in src/ui/
- [ ] Copy + adapt usePersistedState, useTooltipDropdown, cn into src/hooks + src/utils
- [ ] Rewrite useVoiceTranscribe → src/hooks/useVoiceRecording.ts with onTranscribeAudio swap point
- [ ] Move ChatComposer container + View into src/composer/
- [ ] Move ModelSelectorPopover + View into src/model-selector/, drop hardcoded MODEL_OPTIONS, accept via props
- [ ] Extract AutoReviewSelector into src/primitives/ComposerActionSelector + View
- [ ] Move ChatPromptSuggestions into src/prompt-suggestions/
- [ ] Bundle 8 monochrome provider SVGs into src/primitives/ProviderLogo.tsx with per-model override
- [x] Author src/styles/theme.css (chat-* tokens, @theme block, light + dark defaults) — scaffold defaults, will iterate
- [x] Author src/styles/animations.css (composer-placeholder-enter, waveform-scroll keyframes)
- [ ] Storybook covers all states (empty, with text, attachments, recording, transcribing, error, mic-disabled, model-selector with/without, custom logo, footerActions, isLoading, mobile width)
- [x] NOTICE.md crediting Vercel AI Elements + shadcn/ui
- [x] AGENTS.md + CLAUDE.md + README.md per react-overlay precedent
- [x] git submodule add into frontend/lib/react-chat-composer/
- [x] Add 'frontend/lib/react-chat-composer/' to EXEMPT_PATH_FRAGMENTS in check-file-lines.mjs + check-nesting.mjs + check-view-container.mjs
- [ ] Open PR with conventional title 'feat: scaffold @octavian-tocan/react-chat-composer submodule'

## Summary of Changes

PR #166 lands the host-side scaffold:
- New public GitHub repo https://github.com/OctavianTocan/react-chat-composer with v0.1.0 scaffold (tsup, vitest, eslint, prettier, semantic-release, LICENSE, NOTICE, README, AGENTS.md, public type surface in src/types/, theme.css + animations.css with chat-* token namespace)
- Registered as submodule under frontend/lib/react-chat-composer/
- Audit scripts updated to carve out the new submodule path

Runtime component vendoring (the actual ChatComposer/MSP/PromptInput code) is deferred to follow-up bean (created in same flow); PR 3 (pawrrtal-3a64) is blocked on that follow-up.
