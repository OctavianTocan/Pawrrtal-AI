---
name: pnpm10-lifecycle-scripts
paths: [".no-match"]
---
# pnpm 10 Blocks Native Addon Lifecycle Scripts

pnpm 10 silently blocks lifecycle scripts by default, preventing native
addons (better-sqlite3, sharp, bcrypt) from compiling. The symptom is
"Could not locate the bindings file" at runtime despite a clean install.

Fix: add the package to `pnpm.onlyBuiltDependencies` in package.json.

## Verify

"Does this project use pnpm 10+ with native addons? Is the addon listed in
`pnpm.onlyBuiltDependencies`?"

## Patterns

Bad — native addon silently fails to compile:

```json
{
  "dependencies": {
    "better-sqlite3": "^11.0.0"
  }
}
```

Good — explicitly allow lifecycle scripts for native addons:

```json
{
  "dependencies": {
    "better-sqlite3": "^11.0.0"
  },
  "pnpm": {
    "onlyBuiltDependencies": ["better-sqlite3"]
  }
}
```
