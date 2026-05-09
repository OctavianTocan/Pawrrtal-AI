---
# pawrrtal-59xe
title: Fix button-in-button nesting in EntityRow causing hydration error
status: completed
type: bug
priority: normal
created_at: 2026-03-29T22:03:13Z
updated_at: 2026-03-29T22:03:51Z
---

EntityRow uses a <button> as its outer clickable element, but the DropdownMenuTrigger inside it also renders a <button>. HTML forbids nested buttons, causing React hydration errors. Fix: change outer button to div with role=button and keyboard a11y.

## Summary of Changes\n\nChanged the outer `<button>` in `EntityRow` to a `<div role="button" tabIndex={0}>` with Enter/Space keyboard handling. This avoids the HTML constraint that `<button>` cannot be a descendant of `<button>`, which was triggered by the `DropdownMenuTrigger` rendering its own `<button>` inside the row. The fix preserves all a11y behavior (keyboard focus, activation) while eliminating the hydration error.
