---
name: pnpm-only-package-manager
paths: ["**/*"]
---

# pnpm Only

pnpm is the only package manager. No npm, no yarn. Use `--frozen-lockfile` in CI. Never commit node_modules.

**Why:** Mixed package managers create inconsistent lockfiles and dependency resolution. pnpm's strict node_modules structure catches phantom dependencies that npm and yarn silently allow.

**Learned from:** All project configurations — biome.json, package.json conventions across the vendored app, ai-nexus, openclaw plugins.

## Verify

"Am I using npm or yarn commands? Is the CI using `--frozen-lockfile`? Is there a yarn.lock or package-lock.json in the repo?"

## Patterns

Bad — mixed package managers cause inconsistent resolution:

```bash
# Developer uses npm locally
npm install
# CI uses pnpm
pnpm install --frozen-lockfile
# Different resolution → "works on my machine" failures
```

Good — pnpm everywhere, frozen lockfile in CI:

```bash
# Local: always use pnpm
pnpm install
# CI: frozen lockfile for reproducibility
pnpm install --frozen-lockfile
```
