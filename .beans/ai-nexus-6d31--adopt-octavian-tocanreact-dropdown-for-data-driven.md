---
# ai-nexus-6d31
title: Adopt @octavian-tocan/react-dropdown for data-driven select pickers
status: in-progress
type: feature
priority: normal
created_at: 2026-05-04T18:10:12Z
updated_at: 2026-05-04T18:33:08Z
---

Adopt @octavian-tocan/react-dropdown alongside (not replacing) Radix DropdownMenu. Pattern: project wrapper at components/ui/, mirrors how ResponsiveModal wraps @octavian-tocan/react-overlay. Use it for select-style data-driven pickers (items array + getKey/getDisplay), NOT for JSX-children action menus.

## Decision: Fork B (peer primitive, not wholesale replacement)

### Why not A (replace Radix DropdownMenu wholesale)
- ~10 existing DropdownMenu usages in ai-nexus are arbitrary JSX-children action menus (Sign out / Settings / row actions). Forcing them through react-dropdown's items-array API loses idiomatic JSX flexibility for icons, keyboard shortcuts, separators.
- Big surface area, behavior risk for no clear win.

### Why not C (replace combobox)
- combobox.tsx already exists on base-ui and serves a different (search/filter) need. Don't conflate.

### Decision boundary
- **Use react-dropdown when:** data is an items array, you have getKey/getDisplay logic, the menu is select-style.
- **Use Radix DropdownMenu when:** menu items are heterogeneous JSX (icons + shortcuts + separators), action-oriented.

### Reference
- thirdear-webapp src/components/navigation/NavigationMenuDropdown.tsx — canonical compound API usage.
- ai-nexus pattern parallel: components/ui/responsive-modal.tsx wraps @octavian-tocan/react-overlay the same way the new wrapper will wrap react-dropdown.



## Constraint: Chat right-click menu stays on Radix

The chat sidebar item context menu (`ConversationSidebarItemView.tsx` + `components/ui/menu-context.tsx`) is **categorically incompatible** with react-dropdown:

1. It uses Radix `ContextMenu` for right-click activation. react-dropdown has no right-click trigger API.
2. Polymorphic abstraction via `useMenuComponents()` — same item tree renders as DropdownMenu OR ContextMenu via context provider swap. Depends on Radix's symmetric sub-component shapes (DropdownMenu* / ContextMenu*). No equivalent in react-dropdown.
3. Nested submenus (`MenuSub` for status picker + labels) — react-dropdown's flat items array doesn't naturally express nested groups.
4. Heterogeneous JSX inside items (status color dot, icons, labels) — would be lost in items-array shape.

Don't touch this menu in the react-dropdown migration.



## Update — scope nearly evaporated

After designing the ModelSelectorPopover redesign (bean ai-nexus-ql8a), the only previously-identified 'good fit' for react-dropdown was ModelSelectorPopover. That redesign uses sub-menus + secondary description rows + checkmarks, none of which fit react-dropdown's flat items API.

ChatComposerControls remains the only marginal candidate (mode picker with .map), but it has DropdownMenuSeparator between primary/advanced groups — also marginal.

Recommendation: pause this bean. Don't install react-dropdown until a clean items-array select picker appears in product. The visual style we want (provider-grouped, sub-menus, in-menu controls) is squarely in Radix DropdownMenu's lane.
