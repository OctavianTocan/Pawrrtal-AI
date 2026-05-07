---
# ai-nexus-dpbs
title: 'Knowledge UI: structural rework to match Sauna.ai'
status: in-progress
type: feature
priority: high
created_at: 2026-05-07T12:21:43Z
updated_at: 2026-05-07T12:36:52Z
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
