---
# ai-nexus-iqda
title: Add Tauri desktop window and menu config
status: todo
type: task
priority: normal
created_at: 2026-03-04T22:13:24Z
updated_at: 2026-03-04T22:13:24Z
parent: ai-nexus-8ty6
blocked_by:
    - ai-nexus-i0co
---

Configure the Tauri window, native menus, and desktop-specific UI behavior.

## Deliverables

- Window config in `tauri.conf.json`:
  - Default size: 1200x800, min size: 800x600
  - Title: "AI Nexus"
  - Decorations: native title bar (or custom if we want frameless later)
  - Center on screen on launch
- Add native menu bar (File, Edit, View, Help)
  - File → Quit (Cmd+Q / Ctrl+Q)
  - Edit → Cut, Copy, Paste, Select All
  - View → Toggle Sidebar, Zoom In/Out, Actual Size
  - Help → About, Check for Updates (placeholder)
- App icon set (generate from a source icon)
- Drag region if using custom title bar (optional, can defer)

## Notes

- Tauri v2 menus use `tauri::menu::Menu::with_items()" in Rust
- Keep it simple for v1 — native decorations, standard menu
