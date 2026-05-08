---
# pawrrtal-tr56
title: 'Polish chat UI: agent spinner, scrollbar, AI message typography'
status: completed
type: task
priority: normal
created_at: 2026-05-04T11:16:45Z
updated_at: 2026-05-04T11:19:24Z
---

Three-pronged chat UI polish:

1. Replace lucide spinner with terminal-style braille-dots spinner (port from Eronred/expo-agent-spinners — RN-only library, port concept to web)
2. Hide/style the visible vertical scrollbar in the chat conversation area
3. Match AI message typography (font, line-height, spacing) and user message bubble style to thirdear-webapp /c/[uuid] reference (light blue-grey #F1F6F8 bubble with asymmetric rounded corners)

Reference styles in .private/thirdear-webapp/src/features/chat-page/conversation/components/user-message/MessageBubbleView.tsx

## Summary of Changes

### 1. Agent Spinner (terminal-style braille dots)
- **Created** `frontend/components/ui/agent-spinner.tsx` — web port of `DotsSpinner` from Eronred/expo-agent-spinners (RN-only library; ported the technique since it's just `setInterval` cycling Unicode glyphs in a span).
- Frames: `⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏` at 80ms interval. Fixed-width container prevents adjacent text from shifting between frames.
- **Replaced** `<Loader />` (lucide spinner) with `<AgentSpinner />` in `features/chat/components/AssistantMessage.tsx`.

### 2. Hidden chat scrollbar
- Added `scrollbar-hide` utility (already defined in `globals.css` line 539) to the `<Conversation>` wrapper in `features/chat/ChatView.tsx`.

### 3. User message bubble + AI typography (matching thirdear-webapp /c/)
- **User bubble** in `components/ai-elements/message.tsx`:
  - Replaced `rounded-lg` (which was a no-op because theme `--radius: 0rem`) with explicit asymmetric pixel radii: `rounded-tl-[20px] rounded-tr-[20px] rounded-br-[4px] rounded-bl-[20px]` (small bottom-right tail, matching thirdear's MessageBubbleView).
  - Switched bg from `bg-secondary` to the dedicated `bg-user-message-bubble` token.
- **AI message typography** in `MessageResponse` (Streamdown):
  - Bumped base text size from `text-sm` (14px) to `text-[15px]` with `leading-[1.55]` to match the body font-size variable.
  - Added explicit margin/leading rules for paragraphs (`my-3 leading-[1.6]`), lists (`my-3`), list items (`my-1.5`), and headings — Streamdown defaults were too cramped at 15px.
  - Inline code, strong, list-style fixes.

## Files Touched
- `frontend/components/ui/agent-spinner.tsx` (new)
- `frontend/features/chat/components/AssistantMessage.tsx`
- `frontend/features/chat/ChatView.tsx`
- `frontend/components/ai-elements/message.tsx`

Verified: `bun run fix` (biome) and `bun run typecheck` both pass cleanly.
