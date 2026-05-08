---
# pawrrtal-oo34
title: Fix sidebar parity divergences with craft-agents-oss
status: completed
type: task
priority: normal
created_at: 2026-03-26T04:53:31Z
updated_at: 2026-03-26T05:02:38Z
---

Fix the 5 actionable divergences between our sidebar and the Craft reference: search placeholder, badge gradient, context menu, menu integration, and close button visibility.

## Summary of Changes

### Files Created
- `frontend/components/ui/context-menu.tsx` — shadcn-style ContextMenu component (matches dropdown-menu.tsx structure)
- `frontend/components/ui/menu-context.tsx` — Provider pattern for polymorphic menu items (useMenuComponents, DropdownMenuProvider, ContextMenuProvider)

### Files Modified
- `frontend/components/conversation-search-header.tsx` — placeholder text: "Search titles and content..."
- `frontend/components/ui/entity-row.tsx` — added menuContent/contextMenuContent props, built-in DropdownMenu + ContextMenu, badge mask gradient, isInMultiSelect, buttonProps, dataAttributes, onMouseDown
- `frontend/components/conversation-sidebar-item.tsx` — ConversationRowMenu replaced with ConversationMenuContent using useMenuComponents(); age moved to direct titleTrailing; menu passed as menuContent prop

### Biome Formatting (auto)
- `globals.css`, `login-form.tsx`, `nav-chats.tsx` — whitespace/import-order changes only

### Typecheck: PASS (zero source errors)
