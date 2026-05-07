---
# ai-nexus-rijl
title: Migrate composer + NavUser dropdowns to vendored package, retire Radix DropdownMenu
status: todo
type: feature
priority: high
created_at: 2026-05-07T09:31:02Z
updated_at: 2026-05-07T10:33:52Z
---

After all package work lands (asChild, align, flyout submenus, headless hook), unify dropdown library across the app.

## Migration order

1. **NavUser bg fix.** `frontend/components/nav-user.tsx:240-247` passes `contentClassName="w-64 min-w-[var(--radix-dropdown-menu-trigger-width)]"` which strips the package's default `bg-white border`. Switch to `popover-styled w-64` so it inherits the project surface (which after `ai-nexus-yyug` includes backdrop-blur).
2. **AutoReviewSelector style polish.** Already on the vendored package; confirm visual parity with ModelSelectorPopover after backdrop-blur globalization lands.
3. **ModelSelectorPopover migration.** Port from Radix `DropdownMenu` to the vendored package. Uses new flyout submenus (`ai-nexus-za3f`) for per-provider grouping. Uses `asChild` (`ai-nexus-nwcd`) for the Button trigger.
4. **Audit other Radix DropdownMenu consumers.** `grep -r '@/components/ui/dropdown-menu'` to find remaining call sites. Migrate each.
5. **Delete Radix DropdownMenu.** Remove `frontend/components/ui/dropdown-menu.tsx`. Remove `@radix-ui/react-dropdown-menu` from `frontend/package.json`. Verify build.

## Out of scope

- Other Radix primitives (Dialog, Popover, Tooltip, Select, etc.) — only DropdownMenu is being replaced.

## Verification

- Visual parity check on every migrated surface (open / hover / select / close)
- Keyboard parity: Arrow keys, Home/End, Enter, Escape, Tab leave, Type-ahead
- Storybook stories for each migrated surface still pass



## Progress this session

- [x] **NavUser bg fix.** `frontend/components/nav-user.tsx:240-247` updated. `contentClassName` changed from `'w-64 min-w-[var(--radix-dropdown-menu-trigger-width)]'` (transparent dropdown bug — function-parameter default `bg-white` got overridden) to `'popover-styled p-1 w-64'` so the dropdown inherits the project's themed background, border, layered shadow, and (after motion overhaul) global backdrop-filter blur.
- [x] AutoReviewSelector style polish (already on vendored package, completed in ai-nexus-6wxf).

## Still blocked

- ModelSelectorPopover migration is blocked on flyout submenus (bean ai-nexus-za3f) — Radix's `DropdownMenuSub` is used for per-provider grouping, no equivalent in vendored package yet.
- Audit of remaining Radix DropdownMenu consumers (other than ModelSelectorPopover) and the eventual deletion of `frontend/components/ui/dropdown-menu.tsx` happen after migrating the model selector.



## More Radix DropdownMenu consumers found

Surveying `@/components/ui/dropdown-menu` imports turned up 7 more consumers beyond ModelSelectorPopover:

- `features/nav-chats/components/ConversationSidebarItemView.tsx`
- `components/ui/entity-row.tsx` (sidebar three-dot menu primitive — high traffic)
- `components/ui/menu-context.tsx` (generic context menu)
- `components/ui/select-button.tsx` (compact picker)
- `components/ai-elements/prompt-input-attachments.tsx`
- `components/ai-elements/open-in-chat.tsx`
- `components/ai-elements/prompt-input-layout.tsx`

Each needs porting before `frontend/components/ui/dropdown-menu.tsx` can be deleted.

## Status

- [x] AutoReviewSelector — already on vendored package
- [x] NavUser bg fix
- [x] ModelSelectorPopover — ported to vendored DropdownMenu + DropdownSubmenu (uses asChild + flyout submenus + align)
- [ ] entity-row.tsx (and the 6 other consumers)
- [ ] Delete `components/ui/dropdown-menu.tsx`
- [ ] Remove `@radix-ui/react-dropdown-menu` from package.json

The remaining ports are mostly mechanical now that the package has parity. Deferred to a follow-up session.



## Status 2026-05-07 — deferred (single-session scope)

Multi-session task brief asked for the full migration of 6 remaining Radix DropdownMenu / ContextMenu consumers + the build of a vendored `ContextMenu` family + a JSX-children mode panel for `DropdownMenuContent` + deletion of `frontend/components/ui/dropdown-menu.tsx`. None of those landed in this session.

### Why

The session prioritized landing the headless `useDropdown` hook (bean ai-nexus-a3td) cleanly with 22 new tests + docs, plus the keyframes consolidation in globals.css. Building a vendored ContextMenu family that mirrors Radix's surface used by `entity-row.tsx` and `menu-context.tsx` (Trigger, Content, Item, Separator, Sub, SubTrigger, SubContent), then porting 6 consumers without regression, then deleting the Radix package — is a multi-hour piece of work that doesn't compress.

### What's needed before unblock

1. Vendored `DropdownContextMenu` family (Trigger captures `oncontextmenu`, Content portals at cursor coords, Sub family reuses existing `DropdownSubmenu`).
2. JSX-children mode for `DropdownMenuContent` (or a sibling `DropdownPanelMenu`) so consumers can render arbitrary JSX item trees instead of `items + renderItem`.
3. Port each of 6 consumers, run `bunx tsc --noEmit` after each:
   - `frontend/components/ui/entity-row.tsx`
   - `frontend/components/ui/menu-context.tsx`
   - `frontend/components/ai-elements/prompt-input-attachments.tsx`
   - `frontend/components/ai-elements/open-in-chat.tsx`
   - `frontend/components/ai-elements/prompt-input-layout.tsx`
   - `frontend/features/nav-chats/components/ConversationSidebarItemView.tsx`
4. Delete `frontend/components/ui/dropdown-menu.tsx` and `bun remove @radix-ui/react-dropdown-menu`.

API surface needed by consumers (verified via `grep`): Item, Separator, Sub, SubTrigger, SubContent, Shortcut, Label. CheckboxItem / RadioItem / RadioGroup / Group / Portal are NOT used outside the wrapper file and can be skipped on day one.
