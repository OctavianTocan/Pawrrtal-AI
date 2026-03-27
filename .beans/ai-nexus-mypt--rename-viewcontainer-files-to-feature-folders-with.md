---
# ai-nexus-mypt
title: Rename View/Container files to feature folders with PascalCase
status: completed
type: task
priority: normal
created_at: 2026-03-27T19:19:03Z
updated_at: 2026-03-27T19:23:03Z
---

Move View/Container split components from components/ (kebab-case) to features/ (PascalCase) to match the view-container-split rule and the features/chat/ pattern.

## Plan

### features/nav-chats/
- [x] Move nav-chats.tsx → NavChats.tsx
- [x] Move nav-chats-view.tsx → NavChatsView.tsx
- [x] Move conversation-sidebar-item.tsx → ConversationSidebarItem.tsx
- [x] Move conversation-sidebar-item-view.tsx → ConversationSidebarItemView.tsx
- [x] Move collapsible-group-header.tsx → CollapsibleGroupHeader.tsx
- [x] Move conversation-search-header.tsx → ConversationSearchHeader.tsx
- [x] Move conversations-empty-state.tsx → ConversationsEmptyState.tsx
- [x] Move section-header.tsx → SectionHeader.tsx
- [x] Update internal imports + external consumers (new-sidebar, app-sidebar)

### features/auth/
- [x] Move login-form.tsx → LoginForm.tsx
- [x] Move login-form-view.tsx → LoginFormView.tsx
- [x] Update internal imports + external consumer (login/page.tsx)

### features/access-request-banner/
- [x] Move entire folder from components/ to features/
- [x] Rename all files to PascalCase
- [x] Update internal imports + index.ts + consumer (dev page)

### Verify
- [x] biome format --write on all changed files
- [x] tsc --noEmit passes

## Summary of Changes

Moved all View/Container split components from `components/` (kebab-case) to `features/` (PascalCase) to match the view-container-split rule and the existing `features/chat/` pattern:

- **features/nav-chats/** — NavChats + NavChatsView + ConversationSidebarItem + ConversationSidebarItemView + 4 helper components (CollapsibleGroupHeader, ConversationSearchHeader, ConversationsEmptyState, SectionHeader)
- **features/auth/** — LoginForm + LoginFormView
- **features/access-request-banner/** — AccessRequestBanner + AccessRequestBannerView + 5 sub-components (BannerHeader, DecisionPill, ExpandedRequestList, RequestRow, SummaryText) + types + index

Updated all import paths in moved files and 4 external consumers (app-sidebar, new-sidebar, login/page, dev/access-requests/page). Biome formatted and tsc --noEmit passes clean.
