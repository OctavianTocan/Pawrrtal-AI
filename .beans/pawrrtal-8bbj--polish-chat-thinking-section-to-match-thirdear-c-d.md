---
# pawrrtal-8bbj
title: Polish chat thinking section to match thirdear /c/ design
status: completed
type: task
created_at: 2026-05-04T11:22:02Z
updated_at: 2026-05-04T11:22:02Z
---

Followup polish on AssistantMessage ReasoningPanel:

- Drop BrainIcon (was visual noise next to the trigger)
- Switch ChevronDown (rotate-180) to ChevronRight (rotate-90) — matches thirdear ThinkingHeaderView
- Use Shimmer text effect on 'Thinking' label while streaming (was just lucide spinner + static text)
- Drop 'border-l pl-3 ml-1' wrapper — the ChainOfThought already owns a bullet+connector rail; the extra left border was double visual chrome
- Add slide-in-from-top-2 / slide-out-to-top-2 animations to match thirdear's CollapsibleContent transition
- Tighten label to 'Thinking' / 'Thought for Xs' / 'Thought' (no trailing dots, less verbose)

## Summary of Changes

Files touched:
- frontend/features/chat/components/AssistantMessage.tsx
  - Removed BrainIcon, ChevronDownIcon imports; added ChevronRightIcon
  - ThinkingTriggerLabel: now uses Shimmer for streaming state, font-medium for all states
  - ReasoningPanel: dropped BrainIcon from trigger; CollapsibleTrigger now inline-flex with hover-opacity transition; ChevronRight rotates 90° instead of ChevronDown rotating 180°; CollapsibleContent dropped border-l/pl-3/ml-1, added slide-in/out animations; added max-w-prose constraint matching thirdear

Verified: bun run fix and bun run typecheck both pass clean.
