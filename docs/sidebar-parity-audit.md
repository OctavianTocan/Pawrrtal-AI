# Sidebar Parity Audit: pawrrtal vs craft-agents-oss

**Date:** 2026-03-26
**Branch:** `port-craft-session-sidebar-parity`

## File Mapping

| Craft (reference) | pawrrtal (ours) | Status |
|---|---|---|
| `apps/electron/src/renderer/components/app-shell/SessionItem.tsx` | `frontend/components/conversation-sidebar-item.tsx` | Partial match |
| `apps/electron/src/renderer/components/app-shell/SessionSearchHeader.tsx` | `frontend/components/conversation-search-header.tsx` | Close match |
| `apps/electron/src/renderer/components/app-shell/SessionList.tsx` | `frontend/components/nav-chats.tsx` | Partial match |
| `apps/electron/src/renderer/components/app-shell/SessionMenu.tsx` | Inline in `conversation-sidebar-item.tsx` | Simplified |
| `apps/electron/src/renderer/components/app-shell/SessionStatusIcon.tsx` | Inline in `conversation-sidebar-item.tsx` | Simplified |
| `apps/electron/src/renderer/components/app-shell/SessionBadges.tsx` | **Missing** | N/A |
| `apps/electron/src/renderer/components/app-shell/SessionMenuParts.tsx` | **Missing** | N/A |
| `apps/electron/src/renderer/components/app-shell/BatchSessionMenu.tsx` | **Missing** | N/A |
| `apps/electron/src/renderer/components/app-shell/SidebarMenu.tsx` | **Missing** | N/A |
| `apps/electron/src/renderer/components/app-shell/sidebar-types.ts` | **Missing** | N/A |
| `apps/electron/src/renderer/components/ui/entity-row.tsx` | `frontend/components/ui/entity-row.tsx` | Close match |
| `apps/electron/src/renderer/components/ui/entity-list.tsx` | **Missing** (logic inlined in nav-chats) | N/A |
| `apps/electron/src/renderer/hooks/useSessionSearch.ts` | Inlined in `nav-chats.tsx` | Simplified |
| `apps/electron/src/renderer/hooks/useEntityListInteractions.ts` | **Missing** | N/A |
| `apps/electron/src/renderer/hooks/useMultiSelect.ts` | **Missing** | N/A |
| `apps/electron/src/renderer/context/SessionListContext.tsx` | **Missing** | N/A |
| `apps/electron/src/renderer/context/FocusContext.tsx` | **Missing** | N/A |

---

## Differences by Area

### 1. EntityRow (`entity-row.tsx`)

**Matching:**
- Overall layout structure (icon + title + titleTrailing + badges + trailing)
- Icon sizing: `[&>*]:w-3 [&>*]:h-3`
- Title classes: `font-sans truncate min-w-0` (with titleTrailing), `font-medium font-sans line-clamp-2 min-w-0 -mb-[2px]` (without)
- Selection indicator: 2px left bar with `bg-accent`
- Background states: `bg-foreground/3` (selected), `hover:bg-foreground/2` (normal)
- Separator className: `pl-[38px] pr-4`
- Badge row with invisible icon spacer
- Button padding/layout: `pl-2 pr-4 py-3 text-left text-sm outline-none rounded-[8px]`

**Differences:**

| Feature | Craft | pawrrtal |
|---|---|---|
| **Context menu** | Built-in via `ContextMenu` wrapper + `ContextMenuProvider` | **Missing** - no right-click menu |
| **Dropdown menu** | Built-in via `menuContent` prop + `DropdownMenuProvider` | Handled externally in `ConversationRowMenu` |
| **Multi-select** | `isInMultiSelect` prop, accent bar for multi-selected items | **Missing** |
| **Menu visibility** | Controlled by `menuOpen \|\| contextMenuOpen` states | Controlled by `open` state in `ConversationRowMenu` |
| **onMouseDown** | Primary click handler (for modifier key detection: Cmd, Shift) | Not used (uses `onClick` only) |
| **buttonProps** | Spread onto button (keyboard handlers, aria, tabIndex, ref) | Not supported |
| **dataAttributes** | Prop for data-* attrs on outer wrapper | Not supported |
| **overlay** | Absolute overlay slot (match count badge) | Not supported |
| **hideMoreButton** | Prop to hide "..." button | Not supported |
| **Comp element** | Always `<button>` | `asChild` toggles between `<div>` and `<button>` |
| **Badge mask gradient** | `maskImage: linear-gradient(...)` fade-out on overflow | **Missing** |
| **Non-titleTrailing more button** | Absolute positioned in top-right, bigger icon (h-4 w-4), border on hover | **Missing** (pawrrtal only has inline titleTrailing menu) |

### 2. Session/Conversation Item

**Matching:**
- Uses `EntityRow` as base
- Status icon on the left (Circle icon, h-3.5 w-3.5)
- Title text-[13px]
- Age/timestamp display in titleTrailing area
- Timestamp text styling: `text-[11px] text-foreground/40 whitespace-nowrap`
- Separator between non-first items

**Differences:**

| Feature | Craft | pawrrtal |
|---|---|---|
| **Status icon** | `SessionStatusIcon` - colored per status, clickable popover to change status | Static `Circle` icon, not clickable, single muted color |
| **Indicator group** | Animated div with spinner, unread badge (blue dot), plan icon, pending prompt badge | **Missing** - no indicators at all |
| **Shimmer animation** | `animate-shimmer-text` on title when async operation ongoing | **Missing** |
| **Title trailing priority** | 1. Content search match count badge, 2. Flag icon, 3. Timestamp | Age only (no flags, no content search badge) |
| **Age format** | `formatDistanceToNowStrict` with custom short locale (date-fns) | Custom `formatConversationAge` function (similar output, different implementation) |
| **Click handler** | `onMouseDown` with modifier detection (Cmd+Click=toggle, Shift+Click=range, Cmd+Shift+Click=new panel) | Simple `onClick` -> `router.push(href)` |
| **Badges row** | `SessionBadges` showing label tags | **Missing** |
| **Selection via props** | Props: `isSelected`, `isInMultiSelect`, `onSelect`, `onToggleSelect`, `onRangeSelect` | Determined internally via `pathname === href` |
| **Context menu** | Full SessionMenu on right-click; BatchSessionMenu when multi-selected | **Missing** |
| **Props interface** | `SessionItemProps` with `item: SessionMeta`, `index`, `itemProps`, etc. | Simpler: `id`, `title`, `ariaLabel`, `updatedAt`, `showSeparator` |

### 3. Search Header

**Matching:**
- Outer container: `shrink-0 px-2 pt-2 pb-1.5 border-b border-border/50`
- Search wrapper: `relative rounded-[8px] shadow-minimal bg-muted/50 has-[:focus-visible]:bg-background`
- Search icon: `absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground`
- Input: `w-full h-8 pl-8 pr-8 text-sm bg-transparent border-0 rounded-[8px] outline-none focus-visible:ring-0 focus-visible:outline-none placeholder:text-muted-foreground/50`
- Close button: `absolute right-2 top-1/2 -translate-y-1/2 p-0.5 hover:bg-foreground/10 rounded`
- Result count area: `px-2 pt-2.5 flex items-center gap-1.5 text-xs text-muted-foreground`

**Differences:**

| Feature | Craft | pawrrtal |
|---|---|---|
| **Placeholder** | `"Search titles and content..."` | `"Search session titles..."` |
| **Loading state** | Shows `<Spinner>` + "Loading..." while `isSearching` | No loading state |
| **Result count** | Shows `"100+"` when `exceededLimit`, otherwise `resultCount ?? 0` | Always shows exact count |
| **Close button visibility** | Always visible when `onSearchClose` prop exists | Only visible when `searchQuery` is not empty |
| **Props: onKeyDown** | Supported (for forwarding arrow keys to list) | **Missing** |
| **Props: onFocus/onBlur** | Supported (for tracking DOM focus) | **Missing** |
| **Props: inputRef** | Supported (for programmatic focus management) | **Missing** |
| **Props: readOnly** | Supported (for playground demos) | **Missing** |
| **Content search** | Searches both titles AND message content via IPC | Title-only search |
| **Search activation** | `searchQuery.length >= 2` (checked in component) | `searchQuery.trim().length >= 2` (checked in parent + component) |

### 4. Session Menu (Row Actions)

**Matching:**
- "Open" action exists (different label in Craft - via navigation, not a menu item)
- "Copy Link" / "Copy Path" action exists

**Differences:**

| Feature | Craft | pawrrtal |
|---|---|---|
| **Menu architecture** | Dedicated `SessionMenu` component using `useMenuComponents()` context for DropdownMenu/ContextMenu polymorphism | Inline `ConversationRowMenu` component, direct Radix `DropdownMenu` usage |
| **Share** | Share/Shared submenu (share to viewer, copy link, update share, stop sharing) | **Missing** |
| **Status submenu** | Full status picker with colored icons, applied to session | **Missing** |
| **Labels submenu** | Hierarchical label tree with toggle checkmarks | **Missing** |
| **Flag/Unflag** | Toggle flag with `Flag`/`FlagOff` icons | **Missing** |
| **Archive/Unarchive** | Toggle archive status | **Missing** |
| **Mark as Unread** | When session has been read | **Missing** |
| **Rename** | Opens `RenameDialog` | **Missing** |
| **Regenerate Title** | AI-refresh from recent messages | **Missing** |
| **Open in New Panel** | Multi-panel support | **Missing** |
| **Open in New Window** | Electron API | "Open in New Tab" (web equivalent) |
| **Show in Finder** | Platform file manager | **Missing** |
| **Copy Path** | Session JSON file path | **Missing** |
| **Delete** | Destructive with confirmation dialog | **Missing** |
| **Batch menu** | `BatchSessionMenu` on multi-selected right-click | **Missing** |

### 5. Session List / NavChats (Data Pipeline)

**Matching:**
- Groups by date (Today, Yesterday, date label)
- Descending sort by timestamp
- Collapsible groups with localStorage persistence
- Collapse toggle with chevron
- Collapsed group shows count: `LABEL . COUNT`
- Single group disables collapsing
- Empty state with Inbox icon + "No sessions yet"
- Search empty state

**Differences:**

| Feature | Craft | pawrrtal |
|---|---|---|
| **Data source** | Jotai atoms (`sessionMetaMapAtom`) | React Query (`useGetConversations`) |
| **Group date format** | `"Today"`, `"Yesterday"`, `"MMM d"` (via date-fns `format`) | `"Today"`, `"Yesterday"`, `"Mon 15"` (via Intl.DateTimeFormat) |
| **Grouping modes** | `'date'` or `'status'` | Date only |
| **Search pipeline** | `useSessionSearch` hook: debounced IPC content search + fuzzy title matching, pagination (50 items, max 100), filter-aware grouping ("In Current View" / "Other Conversations") | Inline `filterConversationGroups`: simple title-only substring match, no pagination |
| **Collapse scope** | Per workspace/filter/grouping combo via `buildCollapsedGroupsScopeSuffix` | Single global key `nav-chats-collapsed-groups` |
| **Context provider** | `SessionListProvider` injects callbacks/data to all items | No context provider; items get individual props |
| **Keyboard nav** | `useEntityListInteractions` + `useRovingTabIndex`: ArrowUp/Down, Home/End, Enter, Cmd+A | **Missing** |
| **Focus zones** | Three-zone system (sidebar, navigator, chat) with Tab/Shift+Tab, Cmd+1/2/3 | **Missing** |
| **Multi-select** | Full: Cmd+Click toggle, Shift+Click range, Cmd+A select all, Escape clear | **Missing** |
| **Pagination** | Scroll-based: 50 initial, 50 per batch, max 100 | None (renders all) |
| **EntityList** | Dedicated reusable component with groups, collapse, scroll area, loading footer | Custom inline rendering in `NavChats` |
| **Rename dialog** | Built-in `RenameDialog` modal | **Missing** |
| **Archived view** | Separate empty state for archived sessions | **Missing** |
| **Filter chips** | Status and label filter chips during search | **Missing** |
| **Scroll masking** | `mask-fade-top-short` on scroll area | **Missing** |
| **Loading footer** | Spinner when `hasMore` items to paginate | **Missing** |
| **ARIA** | `role="listbox"`, `aria-label="Sessions"`, `data-focus-zone="navigator"` | **Missing** (no listbox role) |

### 6. Sidebar Shell

**Matching:**
- "New Session" button in header with SquarePenRounded icon
- Button styling: ghost variant, text-[13px], rounded-[6px], shadow-minimal
- Cmd+B keyboard shortcut to toggle sidebar

**Differences:**

| Feature | Craft | pawrrtal |
|---|---|---|
| **Sidebar type** | `LeftSidebar` - vertical nav buttons (sessions, sources, settings) | `NewSidebar` - single-panel with header + content |
| **Navigation** | Multi-mode: sessions, sources, settings views | Sessions only |
| **Nav item context menus** | `SidebarMenu` with expand/collapse/unpin | **Missing** |
| **Drag-and-drop** | `SortableList` for reordering status items | **Missing** |
| **Cmd+N shortcut** | `electronAPI.openUrl('craftagents://action/new-session?window=focused')` | `router.push("/")` |

---

## Summary: What's Already Matching

1. **EntityRow layout** - icon + title + trailing structure, selection indicator, hover/selected backgrounds
2. **SearchHeader visual design** - container, input, icon, close button styling all match
3. **Group collapsing** - chevron toggle, collapsed count, localStorage persistence
4. **Date grouping** - Today/Yesterday/date labels, descending sort
5. **New Session button** - icon, text, styling, placement
6. **Row age display** - timestamp in titleTrailing, muted styling

## Summary: What's Different (Scoped to Current Features)

These are differences in features we ALREADY have (not Craft-only features we haven't started):

1. **Search placeholder**: "Search session titles..." vs Craft's "Search titles and content..."
2. **Date format**: `Intl.DateTimeFormat "Mon 15"` vs Craft's `date-fns "MMM d"` (e.g. "Mar 15")
3. **Close button visibility**: Only shows when searchQuery is not empty vs Craft's always-shows-when-prop-exists
4. **EntityRow badges mask gradient**: Missing the fade-out gradient on overflowing badges
5. **EntityRow context menu**: No right-click support
6. **EntityRow menu integration**: Menu is external in ConversationRowMenu vs Craft's built-in menuContent prop
7. **Status icon**: Static Circle vs Craft's colored, clickable status indicator

## Summary: Craft Features Not Yet Ported

(These are fine to skip for now, but documented for future reference)

1. Content search (IPC-based full-text)
2. Multi-select (Cmd+Click, Shift+Click, Cmd+A)
3. Batch operations menu
4. Session status system (todo/done)
5. Labels system
6. Flag/Unflag
7. Archive/Unarchive
8. Rename dialog
9. Delete with confirmation
10. Keyboard navigation (ArrowUp/Down, Home/End, Enter)
11. Focus zone system
12. Status/label grouping mode
13. Pagination (scroll-based)
14. Session indicators (spinner, unread badge, plan icon)
15. Shimmer animation on async titles
16. Open in New Panel / New Window
17. Share/Shared submenu
18. Show in Finder / Copy Path
19. Mark as Unread
20. Regenerate Title
