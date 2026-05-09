---
# pawrrtal-ynv1
title: Configure npm global directory
status: completed
type: task
priority: normal
created_at: 2026-03-26T17:49:23Z
updated_at: 2026-03-26T17:49:55Z
---

Configure npm to use ~/.npm-global instead of system directories to avoid sudo issues

## Summary of Changes

- Created ~/.npm-global directory
- Configured npm to use it as default prefix
- Appended path to ~/.zshrc
- Successfully installed cline globally to verify it works
