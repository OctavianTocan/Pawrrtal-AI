---
# ai-nexus-bfra
title: Show user's first message as temp chat title, then animate loader until AI title arrives
status: todo
type: feature
priority: high
created_at: 2026-03-12T00:25:31Z
updated_at: 2026-03-12T00:25:31Z
---

## Context

When a user creates a new chat, the sidebar currently shows nothing until React Query refetches after `createConversationMutation` succeeds (at which point it shows "New Conversation"). Then later, when `generateConversationTitleMutation` completes and invalidates the cache, the AI-generated title appears.

The UX should be:
1. User sends first message -> sidebar immediately shows the **first message text** as a temporary title (truncated)
2. A loader SVG (already added in `nav-chats.tsx:33-39`) animates next to the title
3. When the AI-generated title arrives (query invalidation from title mutation), replace the temp title and hide the loader

## Current Architecture

- `ChatContainer.tsx` fires three things on first message: `createConversationMutation`, `generateConversationTitleMutation` (fire-and-forget), and `window.history.replaceState`
- `useCreateConversation` and `useGenerateConversationTitle` both invalidate `["conversations"]` query on success
- `nav-chats.tsx` renders conversations from `useGetConversations()` (TanStack Query, key `["conversations"]`)
- The loader SVG is imported but currently renders unconditionally (not wired up)
- Backend creates conversation with title "New Conversation", then updates it async when Gemini returns a title

## Implementation Plan

- [ ] **Optimistic sidebar update**: Use TanStack Query's `onMutate` in `useCreateConversation` to optimistically add the new conversation to the `["conversations"]` cache with the user's first message as the title. This makes it appear instantly in the sidebar.
  - Need to pass `firstMessage` to the create mutation (or set it via query cache directly in `ChatContainer`)
  - Add a `_isGeneratingTitle: true` flag to the optimistic entry so the sidebar knows to show the loader

- [ ] **Conditional loader in sidebar**: Update `nav-chats.tsx` to only show the loader SVG when `conversation._isGeneratingTitle === true` (or similar flag). Hide it for all other conversations.

- [ ] **Clear flag on title arrival**: When `useGenerateConversationTitle` succeeds and invalidates `["conversations"]`, the refetched data replaces the optimistic entry (which had the flag). The real data won't have `_isGeneratingTitle`, so the loader disappears automatically.

- [ ] **Fallback**: If title generation fails, the optimistic title (user's message) stays until next refetch replaces it with "New Conversation". Update `onError` to clear the generating flag immediately so the loader stops even when refetch is delayed.

## Key Files

- `frontend/features/chat/ChatContainer.tsx` (first message flow, lines 70-78)
- `frontend/features/chat/hooks/use-create-conversation.ts` (optimistic update goes here)
- `frontend/features/chat/hooks/use-generate-conversation-title.ts` (clears generating flag)
- `frontend/components/nav-chats.tsx` (conditional loader rendering)
- `frontend/hooks/get-conversations.ts` (conversation type may need extending)
