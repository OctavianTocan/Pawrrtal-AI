---
# pawrrtal-cigl
title: Push frontend test coverage from 36% to 70%
status: todo
type: task
priority: normal
created_at: 2026-05-05T06:08:59Z
updated_at: 2026-05-05T06:08:59Z
---

Coverage was at 35.94% statements after the test push round (commit \`0bd1328\` on \`feat/chat-streaming-thinking-tokens\`). Goal originally was 70%. The remaining surfaces are container-heavy and need richer mocking — each costs 3–5× more effort per coverage point than the simple presentational components already covered.

**Big remaining 0%-coverage surfaces (LOC):**
- \`components/app-layout.tsx\` (516)
- \`features/nav-chats/components/NavChatsView.tsx\` (451)
- \`features/chat/components/ChatComposer.tsx\` (230)
- \`features/nav-chats/NavChats.tsx\` (241)
- \`features/projects/components/ProjectsList.tsx\` (206)
- \`features/nav-chats/hooks/use-nav-chats-orchestration.ts\` (369)
- \`features/nav-chats/hooks/use-conversation-search.ts\` (268)
- \`features/nav-chats/hooks/use-conversation-mutations.ts\` (230)

**Approach.** For each container, prefer testing the extracted view + hook in isolation rather than rendering the full container with all dependencies stubbed. Where extraction is impractical, use \`vi.hoisted\` + factories per the project's testing rules.

**Plan to ~70%:**
1. Add \`renderHook\` tests for the four nav-chats hooks (~+8% coverage).
2. Add view-only tests for NavChatsView, ChatComposer, ProjectsList (~+12%).
3. Add tests for the auth + access-request hooks (~+5%).
4. Audit + remove any unreachable dead code that's dragging the denominator.

## Todo
- [ ] use-conversation-search test
- [ ] use-conversation-mutations test (with QueryClient wrapper)
- [ ] use-nav-chats-orchestration test (heavy mocking)
- [ ] use-conversation-actions test
- [ ] NavChatsView render tests
- [ ] ChatComposer render tests
- [ ] ProjectsList render tests
- [ ] App-layout render tests (provider stack)
- [ ] Re-measure + update bean with final coverage
