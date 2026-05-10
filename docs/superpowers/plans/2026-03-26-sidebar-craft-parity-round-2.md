# Sidebar Craft Parity Round 2 — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Match the pawrrtal sidebar to the Craft reference project across 4 areas: New Session button (tooltip + hover), menu styling + full item list, and sidebar width.

**Architecture:** Pure UI/CSS changes. Menu items are non-functional stubs (onClick handlers are no-ops or toast "Coming soon"). The menu-context provider is extended with submenu components to support Craft's Status/Labels submenus. The popover/menu styling is updated to match Craft's design language (8px radius, subtle hover, layered shadow).

**Tech Stack:** React, Radix UI, Tailwind CSS, Lucide icons

**Testing:** These changes are purely visual — no unit tests. Verification is manual: open the sidebar, hover the button, right-click a row, inspect the menu. Run `tsc --noEmit` and `biome check` after each task.

---

## File Structure

| File | Action | Purpose |
|---|---|---|
| `frontend/app/globals.css` | Modify | Add `popover-styled` CSS class matching Craft |
| `frontend/components/ui/menu-context.tsx` | Modify | Add `MenuSub`, `MenuSubTrigger`, `MenuSubContent` to provider |
| `frontend/components/ui/entity-row.tsx` | Modify | Override menu container className to use Craft styling |
| `frontend/components/ui/sidebar.tsx` | Modify | Update `SIDEBAR_WIDTH` constant |
| `frontend/components/new-sidebar.tsx` | Modify | Update button hover state + tooltip |
| `frontend/components/conversation-sidebar-item.tsx` | Modify | Expand `ConversationMenuContent` with all Craft menu items |

---

## Chunk 1: Foundation (CSS + menu-context + sidebar width)

### Task 1: Add `popover-styled` CSS class

Craft's menus use a shared `popover-styled` class for the popover container. We need to replicate it.

**Files:**
- Modify: `frontend/app/globals.css`

- [ ] **Step 1: Add the popover-styled class**

Add to `globals.css`, inside the `@layer base` block (or at the top level if no layer is used). Place it after existing utility classes:

```css
/* Unified popover styling — matches Craft's menu containers */
.popover-styled {
  background: var(--background);
  color: var(--foreground);
  border-radius: 8px;
  border: none;
  box-shadow:
    rgba(0, 0, 0, 0) 0px 0px 0px 0px,
    rgba(0, 0, 0, 0) 0px 0px 0px 0px,
    rgba(0, 0, 0, 0.06) 0px 0px 0px 1px,
    rgba(0, 0, 0, 0.04) 0px 1px 1px -0.5px,
    rgba(0, 0, 0, 0.04) 0px 3px 3px 0px,
    rgba(0, 0, 0, 0.02) 0px 6px 6px 0px,
    rgba(0, 0, 0, 0.02) 0px 12px 12px 0px,
    rgba(0, 0, 0, 0.02) 0px 24px 24px 0px;
}
```

Note: Craft uses `rgba(var(--foreground-rgb), 0.06)` for the 1px ring and `var(--shadow-blur-opacity)` for depths. We simplify to static opacity values since we don't have those CSS vars yet.

- [ ] **Step 2: Verify** — Run `cd frontend && bunx --bun tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git add frontend/app/globals.css
git commit -m "feat(ui): add popover-styled CSS class matching Craft"
```

---

### Task 2: Extend menu-context.tsx with submenu components

Craft's SessionMenu uses submenus (Status, Labels, Share/Shared). Our provider needs `MenuSub`, `MenuSubTrigger`, `MenuSubContent` to support this polymorphically.

**Files:**
- Modify: `frontend/components/ui/menu-context.tsx`

- [ ] **Step 1: Add submenu imports and types**

Add imports from both dropdown-menu and context-menu for the Sub components. Extend the `MenuComponents` type:

```tsx
import {
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu";
import {
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubTrigger,
  ContextMenuSubContent,
} from "@/components/ui/context-menu";

type MenuComponents = {
  MenuItem: typeof DropdownMenuItem | typeof ContextMenuItem;
  MenuSeparator: typeof DropdownMenuSeparator | typeof ContextMenuSeparator;
  MenuSub: typeof DropdownMenuSub | typeof ContextMenuSub;
  MenuSubTrigger: typeof DropdownMenuSubTrigger | typeof ContextMenuSubTrigger;
  MenuSubContent: typeof DropdownMenuSubContent | typeof ContextMenuSubContent;
};
```

- [ ] **Step 2: Update both providers** to include the new components

In `DropdownMenuProvider`:
```tsx
value={{
  MenuItem: DropdownMenuItem,
  MenuSeparator: DropdownMenuSeparator,
  MenuSub: DropdownMenuSub,
  MenuSubTrigger: DropdownMenuSubTrigger,
  MenuSubContent: DropdownMenuSubContent,
}}
```

Same pattern for `ContextMenuProvider` with ContextMenu variants.

- [ ] **Step 3: Verify** — `tsc --noEmit` and `biome check --write`

- [ ] **Step 4: Commit**

```bash
git add frontend/components/ui/menu-context.tsx
git commit -m "feat(ui): extend menu-context with submenu components"
```

---

### Task 3: Update sidebar width

**Files:**
- Modify: `frontend/components/ui/sidebar.tsx`

- [ ] **Step 1: Change SIDEBAR_WIDTH**

Line 29: Change from `"16rem"` to `"18.75rem"` (300px, matching Craft's default session list width).

```tsx
const SIDEBAR_WIDTH = "18.75rem";
```

- [ ] **Step 2: Verify** — `tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git add frontend/components/ui/sidebar.tsx
git commit -m "feat(sidebar): widen to 300px matching Craft default"
```

---

## Chunk 2: New Session button

### Task 4: Update New Session button tooltip and hover state

**Files:**
- Modify: `frontend/components/new-sidebar.tsx`

- [ ] **Step 1: Update button classes**

Current button className:
```
"w-full justify-start gap-2 py-[7px] px-2 text-[13px] font-normal rounded-[6px] shadow-minimal bg-background"
```

Replace with Craft-matching classes (no background at rest, very subtle hover):
```
"w-full justify-start gap-2 py-[7px] px-2 text-[13px] font-normal rounded-[4px] hover:bg-foreground/[0.03] transition-colors duration-100"
```

Key changes:
- Remove `shadow-minimal bg-background` (Craft has no bg/shadow at rest)
- `rounded-[6px]` → `rounded-[4px]` (matches Craft menu item radius)
- Add `hover:bg-foreground/[0.03]` (Craft's subtle hover tint)
- Add `transition-colors duration-100` (Craft's transition)

- [ ] **Step 2: Update tooltip content**

Craft shows the action label in tooltips (e.g. "Toggle Sidebar"). Match that pattern but include the shortcut:

```tsx
<TooltipContent side="bottom" className="flex items-center gap-2">
  New Session
  <kbd className="text-[10px] text-muted-foreground/70">⌘N</kbd>
</TooltipContent>
```

Change `side="right"` to `side="bottom"` to match Craft's tooltip positioning on TopBar buttons.

- [ ] **Step 3: Verify** — `tsc --noEmit`

- [ ] **Step 4: Commit**

```bash
git add frontend/components/new-sidebar.tsx
git commit -m "feat(sidebar): match New Session button hover and tooltip to Craft"
```

---

## Chunk 3: Menu styling + full Craft items

### Task 5: Update EntityRow menu container styling

The menu container needs to match Craft's popover style instead of shadcn defaults.

**Files:**
- Modify: `frontend/components/ui/entity-row.tsx`

- [ ] **Step 1: Update DropdownMenuContent className**

In the titleTrailing branch (around line 142), the `<DropdownMenuContent align="end">` needs Craft styling overrides:

```tsx
<DropdownMenuContent
  align="end"
  className="popover-styled w-fit min-w-40 font-sans whitespace-nowrap text-xs flex flex-col gap-0.5 !rounded-[8px] !p-1 !shadow-none !ring-0"
>
```

The `!` modifiers override shadcn defaults. The `popover-styled` class provides the shadow and border via CSS.

Do the same for the non-titleTrailing DropdownMenuContent (around line 226).

Do the same for the ContextMenuContent (around line 257).

- [ ] **Step 2: Verify** — `tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git add frontend/components/ui/entity-row.tsx
git commit -m "feat(ui): apply Craft popover styling to EntityRow menus"
```

---

### Task 6: Rewrite ConversationMenuContent with all Craft items

This is the main task. Replace the 3-item menu with the full Craft SessionMenu structure. All items are non-functional stubs.

**Files:**
- Modify: `frontend/components/conversation-sidebar-item.tsx`

- [ ] **Step 1: Add all required icon imports**

```tsx
import {
  Archive,
  AppWindow,
  Circle,
  Columns2,
  CloudUpload,
  Copy,
  ExternalLink,
  Flag,
  FolderOpen,
  Link2,
  MailOpen,
  Pencil,
  RefreshCw,
  Tag,
  Trash2,
} from "lucide-react";
```

- [ ] **Step 2: Add a no-op stub function**

At the top of the file, add a toast stub for menu items that aren't functional yet:

```tsx
function stubAction(label: string) {
  return () => {
    // Non-functional stub — will be implemented later
    console.log(`[stub] ${label}`);
  };
}
```

- [ ] **Step 3: Rewrite ConversationMenuContent**

Replace the current `ConversationMenuContent` with the full Craft SessionMenu structure. Every item from Craft must be present:

```tsx
function ConversationMenuContent({
  href,
  label: _label,
}: {
  href: string;
  label: string;
}) {
  const router = useRouter();
  const { MenuItem, MenuSeparator, MenuSub, MenuSubTrigger, MenuSubContent } =
    useMenuComponents();
  const absoluteHref = useMemo(() => {
    if (typeof window === "undefined") return href;
    return new URL(href, window.location.origin).toString();
  }, [href]);

  return (
    <>
      {/* Share */}
      <MenuItem onClick={stubAction("Share")}>
        <CloudUpload className="h-3.5 w-3.5" />
        <span className="flex-1">Share</span>
      </MenuItem>

      <MenuSeparator />

      {/* Status submenu */}
      <MenuSub>
        <MenuSubTrigger>
          <Circle className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="flex-1">Status</span>
        </MenuSubTrigger>
        <MenuSubContent>
          <MenuItem onClick={stubAction("Status: Todo")}>
            <Circle className="h-3.5 w-3.5 text-blue-500" strokeWidth={2.5} />
            <span className="flex-1">Todo</span>
          </MenuItem>
          <MenuItem onClick={stubAction("Status: In Progress")}>
            <Circle className="h-3.5 w-3.5 text-yellow-500" strokeWidth={2.5} />
            <span className="flex-1">In Progress</span>
          </MenuItem>
          <MenuItem onClick={stubAction("Status: Done")}>
            <Circle className="h-3.5 w-3.5 text-green-500" strokeWidth={2.5} />
            <span className="flex-1">Done</span>
          </MenuItem>
        </MenuSubContent>
      </MenuSub>

      {/* Labels submenu */}
      <MenuSub>
        <MenuSubTrigger>
          <Tag className="h-3.5 w-3.5" />
          <span className="flex-1">Labels</span>
        </MenuSubTrigger>
        <MenuSubContent>
          <MenuItem disabled onClick={stubAction("Labels")}>
            <span className="text-muted-foreground text-xs">No labels configured</span>
          </MenuItem>
        </MenuSubContent>
      </MenuSub>

      {/* Flag */}
      <MenuItem onClick={stubAction("Flag")}>
        <Flag className="h-3.5 w-3.5 text-info" />
        <span className="flex-1">Flag</span>
      </MenuItem>

      {/* Archive */}
      <MenuItem onClick={stubAction("Archive")}>
        <Archive className="h-3.5 w-3.5" />
        <span className="flex-1">Archive</span>
      </MenuItem>

      {/* Mark as Unread */}
      <MenuItem onClick={stubAction("Mark as Unread")}>
        <MailOpen className="h-3.5 w-3.5" />
        <span className="flex-1">Mark as Unread</span>
      </MenuItem>

      <MenuSeparator />

      {/* Rename */}
      <MenuItem onClick={stubAction("Rename")}>
        <Pencil className="h-3.5 w-3.5" />
        <span className="flex-1">Rename</span>
      </MenuItem>

      {/* Regenerate Title */}
      <MenuItem onClick={stubAction("Regenerate Title")}>
        <RefreshCw className="h-3.5 w-3.5" />
        <span className="flex-1">Regenerate Title</span>
      </MenuItem>

      <MenuSeparator />

      {/* Open in New Panel */}
      <MenuItem onClick={stubAction("Open in New Panel")}>
        <Columns2 className="h-3.5 w-3.5" />
        <span className="flex-1">Open in New Panel</span>
      </MenuItem>

      {/* Open in New Tab (our equivalent of "Open in New Window") */}
      <MenuItem
        onClick={() => {
          if (typeof window !== "undefined") {
            window.open(href, "_blank", "noopener,noreferrer");
          }
        }}
      >
        <AppWindow className="h-3.5 w-3.5" />
        <span className="flex-1">Open in New Window</span>
      </MenuItem>

      {/* Show in Finder (web: Open link) */}
      <MenuItem onClick={() => router.push(href)}>
        <FolderOpen className="h-3.5 w-3.5" />
        <span className="flex-1">Open</span>
      </MenuItem>

      {/* Copy Link (our equivalent of Copy Path) */}
      <MenuItem
        onClick={() => {
          if (typeof navigator !== "undefined" && navigator.clipboard) {
            void navigator.clipboard.writeText(absoluteHref);
          }
        }}
      >
        <Copy className="h-3.5 w-3.5" />
        <span className="flex-1">Copy Link</span>
      </MenuItem>

      <MenuSeparator />

      {/* Delete */}
      <MenuItem variant="destructive" onClick={stubAction("Delete")}>
        <Trash2 className="h-3.5 w-3.5" />
        <span className="flex-1">Delete</span>
      </MenuItem>
    </>
  );
}
```

- [ ] **Step 4: Verify** — `tsc --noEmit` and `biome check --write`

- [ ] **Step 5: Commit**

```bash
git add frontend/components/conversation-sidebar-item.tsx
git commit -m "feat(sidebar): add full Craft SessionMenu items as UI stubs"
```

---

### Task 7: Update menu item styling to match Craft

The menu items themselves need Craft's styling. Since our `DropdownMenuItem` and `ContextMenuItem` use shadcn defaults (rounded-xl, px-3, focus:bg-accent), we need to override these to match Craft's item style.

The cleanest approach: add overrides in the `<DropdownMenuContent>` and `<ContextMenuContent>` containers in `entity-row.tsx` using descendant selectors, OR update the base components.

**Decision:** Update the base components (`dropdown-menu.tsx` and `context-menu.tsx`) since we want consistent Craft-like styling everywhere.

**Files:**
- Modify: `frontend/components/ui/dropdown-menu.tsx`
- Modify: `frontend/components/ui/context-menu.tsx`

- [ ] **Step 1: Update DropdownMenuItem**

In `dropdown-menu.tsx`, find the `DropdownMenuItem` className (around line 77). Replace the class string with Craft-matching styles:

Current key classes:
```
gap-2.5 rounded-xl px-3 py-2 ... focus:bg-accent focus:text-accent-foreground
```

Replace with:
```
gap-2 rounded-[4px] px-2 py-1.5 pr-4 ... focus:bg-foreground/[0.03] hover:bg-foreground/[0.03]
```

Also add icon sizing: `[&>svg]:h-3.5 [&>svg]:w-3.5 [&>svg]:shrink-0`

Keep: variant="destructive" handling, disabled handling, data-slot, data-inset.

- [ ] **Step 2: Update DropdownMenuSeparator**

Change from `bg-border/50` to `bg-foreground/10` to match Craft.

- [ ] **Step 3: Update DropdownMenuContent**

Change `rounded-2xl` to `rounded-[8px]`, `min-w-48` to `min-w-40`, add `gap-0.5 w-fit font-sans whitespace-nowrap text-xs flex flex-col`. Replace `ring-1 ring-foreground/5 shadow-2xl` with `popover-styled shadow-none ring-0`.

- [ ] **Step 4: Update DropdownMenuSubTrigger**

Match Craft: `rounded-[4px] hover:bg-foreground/10 focus:bg-foreground/10 data-[state=open]:bg-foreground/10`, icon sizing `[&>svg]:h-3.5 [&>svg]:w-3.5`, `gap-2 px-2 py-1.5 pr-1.5`

- [ ] **Step 5: Update DropdownMenuSubContent**

Same popover-styled treatment as content. `rounded-[8px]`, `min-w-36`, `gap-0.5`, `popover-styled`.

- [ ] **Step 6: Mirror ALL changes to context-menu.tsx**

The ContextMenu components must have identical styling to their Dropdown counterparts. Apply the same class changes to `ContextMenuItem`, `ContextMenuSeparator`, `ContextMenuContent`, `ContextMenuSubTrigger`, `ContextMenuSubContent`.

- [ ] **Step 7: Remove EntityRow className overrides from Task 5**

Since the base components now have Craft styling, the className overrides added in Task 5 are no longer needed. Revert `entity-row.tsx` DropdownMenuContent/ContextMenuContent to plain `<DropdownMenuContent align="end">` / `<ContextMenuContent>` with no extra classes.

- [ ] **Step 8: Verify** — `tsc --noEmit` and `biome check --write`

- [ ] **Step 9: Commit**

```bash
git add frontend/components/ui/dropdown-menu.tsx frontend/components/ui/context-menu.tsx frontend/components/ui/entity-row.tsx
git commit -m "feat(ui): update dropdown and context menu styling to match Craft"
```

---

## Execution Order

1. **Task 1** — popover-styled CSS (foundation for menu containers)
2. **Task 2** — menu-context submenu components (foundation for submenus)
3. **Task 3** — sidebar width (independent, quick win)
4. **Task 4** — New Session button (independent)
5. **Task 7** — Base menu component styling (must come before Task 6 so items render correctly)
6. **Task 5** — EntityRow container overrides (depends on Task 1; may be reverted by Task 7)
7. **Task 6** — Full menu items (depends on Tasks 2, 5/7)

**Simplified if Tasks 5+7 are combined:** Do Task 7 first (update base components), skip Task 5 entirely.

**Recommended execution order:** 1 → 2 → 3 → 4 → 7 → 6

---

## Reference: Craft vs pawrrtal Menu Styling Comparison

| Property | Craft | pawrrtal (current) | pawrrtal (target) |
|---|---|---|---|
| Container radius | 8px | rounded-2xl (16px) | rounded-[8px] (8px) |
| Container border | layered box-shadow | ring-1 ring-foreground/5 | popover-styled class |
| Container min-width | min-w-40 (160px) | min-w-48 (192px) | min-w-40 |
| Container shadow | Multi-stop layered | shadow-2xl | popover-styled class |
| Item inter-gap | gap-0.5 | none | gap-0.5 |
| Item padding | px-2 py-1.5 pr-4 | px-3 py-2 | px-2 py-1.5 pr-4 |
| Item radius | rounded-[4px] | rounded-xl (12px) | rounded-[4px] |
| Item hover | bg-foreground/[0.03] | bg-accent | bg-foreground/[0.03] |
| Item icon sizing | h-3.5 w-3.5 | size-4 (16px) | h-3.5 w-3.5 |
| Item gap | gap-2 | gap-2.5 | gap-2 |
| Separator | bg-foreground/10 | bg-border/50 | bg-foreground/10 |
