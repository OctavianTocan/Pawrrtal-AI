---
name: pnpm-store-dir-on-external-drive
paths: [".no-match"]
---

# pnpm Store on External Drives Needs Explicit store-dir Config - Default Path Breaks

Category: general
Tags: [pnpm, macos, development-environment]

## Rule

Set `store-dir=.pnpm-store` in `.npmrc` when the project may live on an external drive — pnpm hardlinks cannot cross filesystem boundaries.

## Why

pnpm's content-addressable store defaults to the internal SSD (`~/Library/pnpm/store`). Hardlinks cannot cross filesystem boundaries. When the project is on an external volume, pnpm silently falls back to copying, causing slower installs, more disk usage, and occasionally broken symlink resolution.

## Examples

### Bad

```ini
# .npmrc — no store-dir, relies on default (internal SSD)
# Hardlinks fail silently when project is on external drive
```

### Good

```ini
# .npmrc — project-local store, hardlinks always work
store-dir=.pnpm-store
```

```gitignore
# .gitignore
.pnpm-store/
```

## References

- expo-external-drive-compat skill: pnpm hardlinks fail across filesystems

## Verify

"Is the project on an external drive? Does `.npmrc` set `store-dir`? Are hardlinks working correctly?"

## Patterns

Bad — default store on different filesystem:

```ini
# .npmrc — empty or no store-dir
# Project on /Volumes/External/project
# pnpm store on /Users/.../Library/pnpm/store (internal SSD)
# Hardlinks fail → silent copy fallback → slow installs, more disk usage
```

Good — project-local store avoids cross-filesystem issues:

```ini
# .npmrc
store-dir=.pnpm-store
# Store lives alongside project on same filesystem
# Hardlinks work → fast installs, minimal disk usage
```
