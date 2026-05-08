---
# pawrrtal-uobp
title: 'UI cleanup pass: nav fixes, rename modal, settings, composer placeholder'
status: scrapped
type: task
priority: normal
created_at: 2026-05-06T12:02:21Z
updated_at: 2026-05-07T16:30:29Z
---

Round 2 of inspector-driven UI fixes plus a bug fix.

## Fixes

- Reverted sidebar text sizes to 14px per DESIGN.md L352 (do-not-drop-below-14px rule). Last round shipped 12px headers in violation.
- Projects section header: text-foreground + font-semibold + mt-3 — stands out as a section, not a label.
- FolderPlus/Folder icons in projects: size-3.5 (was size-4, visibly oversized).
- Conversation row padding py-3 -> py-2.
- Wired Back/Forward buttons in AppHeader to window.history.back()/forward().
- Refactored RenameProjectModal to key-based remount (was setState-during-render, fighting the user's keystrokes when clearing the field).
- ChatComposer: new placeholderOverride prop; ChatView passes 'Ask a follow up' for follow-up turn.
- ChatView ConversationContent pt-12 (first message no longer flush with panel chrome).
- ReplyActionsRow -mt-0.5 (tucked under message body).
- Removed duplicate Preferences SettingsCard in GeneralSection (lived alongside Appearance section, mock that drifted out of sync).
- SettingsSectionHeader: new noDivider prop; AppearanceSection Theme card uses it (fixes the stray hairline at the bottom of the rowless card).
- Scrollbar fade-on-hover: sidebar shell gets 'group', new scroll wrapper gets 'scrollbar-hover' (existing globals.css utility).
- Listbox mt-3 to space the conversation groups from the Projects section.

## Skipped

- More-actions row button 'doesn't move with sidebar' — current impl uses min-w-[240px] + overflow:hidden so the row IS clipped from the right, which is the requested 'pushing off' effect. Not clear what visual diff the user sees. Worth a follow-up bean if it really is misbehaving.
- DESIGN.md typography overhaul — out of scope for this round. The existing doc IS thorough; the violation was 'I didn't follow it,' not 'it's missing rules.'
- AppearanceSection function still warns at 121 lines (was 128 before). Pre-existing. Not blocking.

## TODO
- [x] Revert sidebar 12px to 14px floor (DESIGN.md L352)
- [x] Wire Back/Forward buttons to window.history
- [x] Fix RenameProjectModal (setState-in-render bug)
- [x] Add 'Ask a follow up' placeholder for follow-up composer
- [x] Reduce conversation row padding 12 -> 8
- [x] First message starts lower in ChatView
- [x] ReplyActionsRow tighter to message body
- [x] Remove duplicate Preferences card in GeneralSection
- [x] Theme card: noDivider to kill stray hairline
- [x] Scrollbar fade-on-hover (sidebar group + scrollbar-hover utility)
- [x] Section rhythm: Projects mt-3, listbox mt-3
- [x] Smaller Folder/FolderPlus icons
- [x] Format + tsc clean
- [x] Commit logical chunk
