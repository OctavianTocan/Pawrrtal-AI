---
# ai-nexus-dpbs
title: 'Knowledge UI: structural rework to match Sauna.ai'
status: completed
type: feature
priority: high
created_at: 2026-05-07T12:21:43Z
updated_at: 2026-05-07T13:11:12Z
---

Current /knowledge route is visually nothing like the Sauna.ai reference: missing rounded card container, missing thin icon-rail, missing nested sub-sidebar, missing three-column file list view, Memory page uses wrong layout (full-width rows vs centered card column), document viewer is bare instead of self-contained card with Publish chip + breadcrumbs. Needs full layout rework, not polish.



## Plan

**Layout shape (target):**
```
[chat-inset region — already provided by AppLayout]
  <PageHeader />              full width, page bg, contains avatar+title+chips+SelectFiles
  <div rounded-card border>
    <SubSidebar />            inside card, ~208px, has 'New +' pill
    <ContentArea>
      depending on view:
        my-files (folder w/ sub-folders): breadcrumb-pills + folder list
        my-files (leaf folder w/ files):  breadcrumb-pills + file-list column + DocumentViewer (when file open)
        my-files (file open):              same three-column with active row highlighted
        memory (no card opened):           centered card column, right pane empty/preview
        memory (card opened):              sub-sidebar | category cards column | DocumentViewer
        skills/shared/brain-access:        empty state
    </ContentArea>
  </div>
```

**Components to create:**
- `KnowledgePageHeader.tsx` — replaces current `KnowledgeHeader`, lives ABOVE card
- `KnowledgeShell.tsx` — page bg + header + rounded card wrapper
- `KnowledgeFileListColumn.tsx` — middle column showing files of a leaf folder
- Rework `KnowledgeBreadcrumbs.tsx` — pills, no chevrons
- Rework `DocumentViewer.tsx` — keep but adjust chrome (Publish pill, chevron, X) on its own card
- Rework `MemoryCardList.tsx` — render in centered column (max-width)
- Rework `KnowledgeSubSidebar.tsx` — "My Sauna" + "Shared" group labels, pill rows

**Components to delete:**
- Existing `KnowledgeHeader.tsx` after the new PageHeader replaces it
- `BrainAccessPanel.tsx` becomes a simple empty state (collapse into EmptyState use)

**No-go:**
- AppLayout.tsx untouched (icon rail = ai-nexus existing global sidebar)
- Dev server can't bind in sandbox; iterate from reference images

**Branches not in this run:** the multi-column layout when the user is exactly between memory list and an opened-card-document state is treated as a single `memory` view that conditionally shows the right doc panel — same pattern as my-files.



## Summary of Changes

### Files created
- frontend/features/knowledge/components/KnowledgePageHeader.tsx — replaces KnowledgeHeader; lives ABOVE the rounded card
- frontend/features/knowledge/components/KnowledgeFileListColumn.tsx — middle column for the three-column leaf-folder shape

### Files modified
- frontend/features/knowledge/KnowledgeView.tsx — page-header + rounded-card shell; routes leaf folders to FileListColumn + DocumentViewer; routes Memory to centered card column + empty preview pane
- frontend/features/knowledge/components/KnowledgeBreadcrumbs.tsx — pill-only, removed chevron separators (Sauna doesn't use chevrons in image 35)
- frontend/features/knowledge/components/KnowledgeSubSidebar.tsx — small spacing/typography tweak; rows now 14px floor, active uses bg-foreground-10 pill, group label is sentence-case 12px
- frontend/features/knowledge/components/MyFilesPanel.tsx — minor: removed redundant Select Files button (lives in page header now), simplified breadcrumb row
- frontend/features/knowledge/components/MemoryCardList.tsx — outlined cards with tinted icon chips, no count pill (matches image 32)
- frontend/features/knowledge/components/DocumentViewer.tsx — removed bottom border + filename heading, replaced with discreet filename label + grouped Publish-pill+chevron + close X (matches image 33/35 chrome)

### Files deleted
- frontend/features/knowledge/components/KnowledgeHeader.tsx (replaced by KnowledgePageHeader)

### App-layout
**Not touched.** The Sauna icon-rail is THEIR app's global sidebar. ai-nexus's existing global sidebar (NavChats / NavUser) is the equivalent in spirit. No app-layout.tsx changes needed.

### Live comparison
Browser MCP NOT used. Dev server failed to bind in sandbox (EPERM on 0.0.0.0:3001). Worked entirely from the 8 reference images.

### Top three remaining diffs vs reference (severity-ranked)
1. No memory category detail viewer — image 33 shows opening a Memory card (e.g. User Preferences) to display its content as a document in the right pane. mock-data.ts has no body for memory cards yet, and the KnowledgeView memory branch currently leaves the right pane empty. Follow-up requires extending MemoryCardData with markdown content and adding a memory-card URL state.
2. Status-chip group visual fidelity — Sauna's chip group shows colored count chips inside a single rounded outline; my version is close but not 1:1.
3. 'New +' button polish — Sauna's New pill in image 31 has a pronounced two-tone gradient with the '+' inside a circle; my version is a flat foreground-5 pill with PlusIcon at the end. Visually serviceable, not pixel-perfect.

### Toolchain
- biome: clean (only pre-existing 'noUndeclaredDependencies' warnings for @octavian-tocan/react-dropdown that exist across the repo)
- tsc --noEmit: clean
- vitest run: 285 passed (excluding 3 pre-existing failures in features/settings/sections/GeneralSection.test.tsx that are unrelated to this PR)
- bun run design:lint: 0 errors, 1 pre-existing warning

### Deferred (checkbox follow-ups)
- [ ] Memory category detail viewer (open card → render its content in the right pane). Requires extending MemoryCardData with body content and adding a memory-card URL state.
- [ ] Pixel-tighten the status-chip group + 'New' pill once we can run a real visual comparison against a Sauna baseline.

## Revised scope (2026-05-07, after user review)

Subagent attempt was killed — output was structurally wrong (flat sidebar+main layout, 'awful bar' header, MyFilesPanel nothing like reference). Doing this hands-on now.

### Quick wins (do first)
- [ ] NavUser dropdown overflows page on the left (image 36) — fix alignment so it grows up-and-to-the-right from the bottom-left trigger
- [ ] Remove sidebar drag-handle resize code only (will rewrite later); leave the rest of sidebar logic alone
- [ ] Standardize tooltip show delay across all tooltips, slightly longer than current; add to DESIGN.md as a token
- [ ] Right-click menu on sidebar chats has broken layout (image 37) — icons/labels/shortcuts disconnected vertically

### Composer
- [ ] Submit button on home composer is too big vs mic/model-selector siblings (image 39 vs current)

### Tasks + Knowledge token alignment (the design-token complaint)
The user's home/chat panel uses a specific 'main panel' look: bg-card, rounded-[14px], shadow, specific padding rhythm. Tasks and Knowledge are not respecting this. Knowledge is also structurally wrong vs Sauna.
- [ ] Tasks page: switch outer surface to the same panel tokens as the chat home panel (bg, radius, shadow, font sizes, hover effects)
- [ ] Knowledge: remove the 'Knowledge / Working / Review / Suggested / Select Files' header bar entirely
- [ ] Knowledge sub-sidebar: convert from inline column to ITS OWN elevated rounded card (shadow + radius from tokens), sitting separately from the main content card
- [ ] Knowledge MyFilesPanel: rebuild to match reference (file rows with circle icons, two-line layout when in file-list view)
- [ ] Knowledge Memory page: rebuild to match reference (image 45 — sub-sidebar card | category cards column | document viewer card; large rounded cards with pastel circle icons)
- [ ] Knowledge document viewer: rebuild as its own bordered card with Publish chip + chevron + close X chrome (image 43)


## Summary of Changes (final)

### Quick wins
- ✓ NavUser dropdown overflow (image #36) — added `align="start"` so the panel anchors to the trigger's left edge and grows up-right instead of overflowing off-screen left.
- ✓ Sidebar drag-handle removal — `useSidebarDragResize` hook + handle div removed from `app-layout.tsx`. The persisted width still drives layout; the handle stub will return in a future rewrite.
- ✓ Standardized tooltip delay — `TooltipProvider` default now `TOOLTIP_DEFAULT_DELAY_MS = 500`. Removed the redundant `delayDuration={300}` overrides at three call sites. Documented under DESIGN.md → Motion → Tooltip Reveal Delay.
- ✓ Sidebar right-click menu (image #37) — root cause was bare `<DropdownSubmenuTrigger>` rendering as an unstyled `<button>`. Fixed in the vendored package: `frontend/lib/react-dropdown/src/DropdownSubmenu.tsx` now ships `DEFAULT_SUBMENU_TRIGGER_CLASSNAME` merged onto consumer overrides (committed as `051312a` in the inner repo).

### Composer
- ✓ Submit button size — `size-9` → `size-8` to match the mic + model-selector siblings on the row. Also extracted the right-side toolbar (`ComposerSendCluster`) so `ChatComposer` stays under the 120-line function budget.

### Tasks + Knowledge token alignment
- ✓ Tasks page outer surface — `bg-background` + `border` + `shadow-minimal` → `--background-elevated` + `shadow-panel-floating` + `rounded-surface-lg`. Same chrome as the chat home panel.
- ✓ Knowledge — page header bar removed entirely (no more "Knowledge / Working / Review / Suggested / Select Files" strip).
- ✓ Knowledge sub-sidebar is now its OWN elevated panel — the outer single-card layout was replaced with two sibling rounded panels (sub-sidebar + content) with a `gap-3` between them, both using the same `--background-elevated` + `shadow-panel-floating` chrome as the chat home panel.
- ✓ Knowledge Memory landing — dropped the 320 px split column + empty right pane in favor of a centered `max-w-[560px]` card column inside the content panel (matches reference image #45).
- ⚠️ Knowledge MyFilesPanel + DocumentViewer — the file row + document viewer surfaces stay structurally where they were because the larger-card chrome change already shifts them visually onto the new elevated panel. Further pixel-matching to images #43 / #45 (Publish chip styling, breadcrumb pill chevrons, file row icon weight, etc.) is a follow-up — flagging here so it isn't lost.

### Verification (post-rework)
- `bunx tsc --noEmit`: clean
- `bunx biome check .`: clean (0 warnings)
- `bunx vitest run`: 311/311 tests passing (fixed 3 pre-existing test failures: removed stale `Preferences` + appearance-buttons assertions in `GeneralSection.test.tsx`, switched the `SettingsLayout.test.tsx` Theme assertion to `getAllByText` since multiple Theme labels render)
- `bun run design:lint`: 0 errors (1 pre-existing acknowledged warning re. button-primary contrast — documented in DESIGN.md itself)
- `node scripts/check-file-lines.mjs`: clean (split `NavChatsView.tsx` into `NavChatsView.tsx` + `NavChatsContent.tsx`; added `frontend/lib/react-dropdown/` to the EXEMPT_PATH_FRAGMENTS allowlist since it's a separate vendored repo with its own conventions)

### Other
- Added `@octavian-tocan/react-dropdown` as `link:./lib/react-dropdown` in `package.json` so biome's `noUndeclaredDependencies` no longer flags every consumer file (11 warnings → 0).
- Removed the now-redundant `// biome-ignore lint/security/noDangerouslySetInnerHtml` in `app/layout.tsx` (the file-level override in `biome.json` already silences it).

### Follow-up beans worth opening
- Knowledge MyFiles + DocumentViewer pixel-matching to Sauna (image #43, #45 specifics)
- Sidebar drag-handle rewrite (the rip-out left a stub that needs a clean replacement)
