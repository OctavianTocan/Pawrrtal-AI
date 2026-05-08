---
# pawrrtal-n2ho
title: Refactor Connect strip as composer footer band
status: completed
type: bug
priority: normal
created_at: 2026-05-03T21:02:57Z
updated_at: 2026-05-03T21:05:35Z
---

Strip currently floats below composer; should look like a natural extension inside the same card.



---

**Resolution (commit `a7efa4e`)** — Implemented Approach A: `ConnectAppsStrip` now renders as a second `block-end` `InputGroupAddon` inside `<PromptInput>`, so it shares the composer's rounded `<InputGroup>` surface, border, and background. The strip's own outer rounded border and bg were removed; only a subtle 1px `before:` divider separates it from the toolbar above. `ChatComposer` gained a `showConnectAppsStrip` flag (passed only from the empty-conversation branch in `ChatView`). `PromptInput` internals untouched, no new deps.
