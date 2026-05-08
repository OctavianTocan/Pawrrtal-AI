---
# pawrrtal-f7k0
title: Add Connect your apps strip under chat input
status: completed
type: feature
priority: normal
created_at: 2026-05-03T20:55:00Z
updated_at: 2026-05-03T20:58:45Z
---

Strip implemented in frontend/features/chat/components/ConnectAppsStrip.tsx and rendered in ChatView empty-state below ChatComposer (above ChatPromptSuggestions). Uses lucide-react icons NotebookText (Notion), Slack, HardDrive (Drive), Github, SquareKanban (Linear), and X for dismiss. Local useState-based dismissal, no persistence. Typecheck and biome on changed files green. Commit 5dfba64.
