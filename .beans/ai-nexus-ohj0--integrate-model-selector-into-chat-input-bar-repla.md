---
# ai-nexus-ohj0
title: Integrate model selector into chat input bar (replace dialog-based selector)
status: todo
type: task
priority: high
created_at: 2026-03-12T00:41:58Z
updated_at: 2026-03-12T00:44:45Z
parent: ai-nexus-3i2d
blocked_by:
    - ai-nexus-6k3a
---

## Goal

Take the custom model selector component (from ai-nexus-6k3a) and integrate it into the actual chat UI, replacing the current dialog-based ai-elements ModelSelector in ChatView.tsx.

This is the "last mile" task that makes the model selector actually usable in the app.

## Current State

`ChatView.tsx` currently renders:
- A `ModelSelectorTrigger` button (from ai-elements) that opens a full-screen Command dialog
- Hardcoded single model: "Gemini 3 Flash Preview" in a Google group
- Local state: `const [selectedModel, setSelectedModel] = useState("gemini-3-flash-preview")`

## What to Do

- [ ] Remove the ai-elements ModelSelector imports and usage from `ChatView.tsx`
- [ ] Import and render the new custom `ModelSelectorPopover` component in the chat input area
- [ ] Position the trigger button in the bottom bar of the chat input (like the Codex screenshot: compact pill next to the send button)
- [ ] Wire `selectedModel` state to the new component's `onSelect` callback
- [ ] Use mock grouped data initially (Google: [gemini-3-flash, gemini-3-pro], Anthropic: [claude-sonnet-4-5], OpenAI: [gpt-5.4])
- [ ] Make sure the popover opens UPWARD (since the trigger is at the bottom of the screen, the dropdown should flip above it)
- [ ] Test: clicking a model updates the trigger button text + icon, popover closes smoothly

## Design Target

The trigger should look like this in the input bar:
```text
[📎 Attach] [🔍 Search] ................ [🟢 gemini-3-flash v] [➡️ Send]
```
- Small pill/button
- Provider icon (from models.dev/logos/) + model name + chevron-down
- Clicking opens the grouped popover ABOVE the button
- Selecting a model closes popover and updates the pill

## Key Files

- `frontend/features/chat/ChatView.tsx` (remove old selector, add new one)
- `frontend/components/model-selector-popover.tsx` (the new component from ai-nexus-6k3a)
- `frontend/hooks/use-model-selector.ts` (the hook from ai-nexus-6k3a)
