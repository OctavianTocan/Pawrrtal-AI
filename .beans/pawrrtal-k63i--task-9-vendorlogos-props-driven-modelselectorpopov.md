---
# pawrrtal-k63i
title: 'Task 9: VendorLogos + props-driven ModelSelectorPopover'
status: in-progress
type: task
priority: high
tags:
    - chat
    - frontend
created_at: 2026-05-14T07:26:18Z
updated_at: 2026-05-14T07:26:18Z
blocked_by:
    - pawrrtal-got4
---

Extract VendorLogos.tsx (vendor -> icon map) and refactor ModelSelectorPopover to receive ChatModelOption[] via props from useChatModels(). Removes the in-component CHAT_MODEL_IDS / ChatModelId duplicate catalog. Per docs/plans/2026-05-14-model-id-canonical-format-and-catalog.md Task 9.
