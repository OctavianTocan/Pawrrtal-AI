---
# ai-nexus-j48u
title: Chat row context menu — overhaul + visual states
status: in-progress
type: feature
priority: high
created_at: 2026-05-04T20:34:26Z
updated_at: 2026-05-04T20:55:29Z
---

Rebuild the right-click menu for conversation rows so its actions actually produce visible feedback. Spec was settled via /grill-me — see this body for the lock.

## Top-tier menu (8 + More submenu)

Open · Status ▸ · Labels ▸ · Flag/Unflag · Mark Unread/Read · Rename · Archive/Unarchive · More ▸ · Delete

More ▸: Regenerate Title · Open in New Window · Copy Link · Export as Markdown · Duplicate

## Cuts
Share, Star, Pin, Move to Project, Open in New Panel — removed from menu.

## Row visual indicators
- status: filled colored circle (blue/yellow/green) in left icon slot
- is_unread: bolder title + chat-bubble glyph in trailing area
- is_flagged: NO row glyph (toast only)
- is_archived: filtered into collapsed "Archived" group at bottom of sidebar
- labels: existing ConversationLabelBadge row (already implemented)

## UX patterns
- Toasts via sonner (bottom-center) for: Flag, Archive, Mark Unread, Status, Label, Regenerate Title, Copy Link, Duplicate
- Delete keeps modal confirmation (D1)
- Multi-select right-click acts on all selected rows (M1) — bulk-eligible items only
- Keyboard shortcuts wired globally: F2 rename, E archive, ⌫ delete; others hint-only

## Backend
- Add `conversations.labels` column (Postgres array)
- Extend PATCH /conversations/{id} to accept labels[]
- Duplicate: implement only if message backfill API exists; otherwise ship disabled with follow-up bean

## Todo
- [x] Install sonner + mount Toaster + lib/toast.ts wrapper
- [x] Backend: add labels column + Alembic migration
- [x] Backend: extend PATCH endpoint to accept labels[]
- [x] Frontend: add NAV_CHATS_LABELS constant + types
- [x] Update useUpdateConversationMetadata to accept labels[]
- [x] Add handleToggleLabel to use-conversation-metadata-actions
- [x] Rewrite ConversationMenuContent with two-tier structure
- [x] Wire toasts on every metadata action
- [x] ConversationStatusGlyph renders distinct colored glyph per status
- [x] Row: bolder font + chat-bubble glyph when is_unread
- [x] Sidebar: collapsed Archived group at bottom + filter logic
- [ ] Multi-select right-click: detect selection state and act on all selected (DEFERRED — follow-up)
- [x] Keyboard shortcuts: F2 / E / ⌫ when row focused
- [x] Export as Markdown: serialize messages, trigger download
- [x] Duplicate: stubbed with toast (DEFERRED — backend clone endpoint not built)
- [x] biome + tsc clean on all touched files
- [ ] Follow-up beans for: real Share, label CRUD (L2), Pin if revisited

## Summary of Changes

### Backend
- New `labels` JSON column on `conversations` (Alembic migration `004_add_conversation_labels`).
- `ConversationUpdate` now accepts optional `labels: list[str]`; `ConversationResponse` always serialises `labels: list[str]` (never null).
- CRUD service treats labels as a full replacement set.

### Frontend
- `app/providers.tsx` mounts a global sonner `<Toaster>`; new `lib/toast.ts` wrapper centralises calls + dedupe IDs.
- New `NAV_CHATS_LABELS` constant (Bug, Feature, Idea, Question, Reference) + `getLabelById` helper. New `ARCHIVED_GROUP_KEY`.
- `useConversationMetadataActions` toasts on every PATCH (flag, archive, mark unread, status change, label toggle, regenerate title) and grew a new `handleToggleLabel`.
- `useExportConversation` hook serialises a chat to Markdown and triggers a Blob download.
- `useConversationActions` exposes `handleExportMarkdown(id)`.
- `ConversationSidebarItemView` rewritten:
  - Two-tier menu: top tier = Open / Status ▸ / Labels ▸ / Flag / Mark Unread / Rename / Archive / More ▸ / Delete. "More" submenu = Regenerate Title / Open in New Window / Copy Link / Export as Markdown / Duplicate.
  - Status: filled colored glyph in the left slot per state (CircleDashed/info, CircleDot/warning, CheckCircle2/success).
  - Unread: bolder title weight + chat-bubble glyph in the trailing area before the age string.
  - All menu items show keyboard shortcut hints (↵ / F2 / E / ⌫ / ⇧F / ⇧U).
- `NavChats` partitions archived rows into a trailing collapsible "Archived" group; first-run default is collapsed (persisted via existing localStorage set).
- `useNavChatsOrchestration` keydown handler refactored into small `tryHandle*` helpers; F2 / E / Backspace fire rename / archive / delete on the focused row.

### Cuts (per spec)
Share, Star, Pin, Move to Project, Open in New Panel — removed entirely from the menu.

### Verified
- `bunx --bun @biomejs/biome check` — clean.
- `bunx tsc --noEmit` — clean.
- Backend migration: `uv run alembic upgrade head` ran on Postgres.
- Backend schemas validated via Pydantic JSON schema dump.

### Known scope gaps (follow-up beans recommended)
- Multi-select right-click bulk actions (M1) — selection logic exists but the menu still acts on the right-clicked single row. Adapting requires bulk-variant handlers.
- Duplicate — UI entry exists but toasts "Coming soon" until a backend `POST /conversations/{id}/duplicate` clone endpoint is built.
- Share — explicitly cut this round; bring back when share-token infrastructure lands.
