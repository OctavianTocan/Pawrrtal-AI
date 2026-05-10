# Biome & TSConfig Alignment with web-ce-shared-packages

**Date:** 2026-03-27
**Status:** Draft
**Scope:** Config-only PR. No reformatting. Enforcement deferred to a follow-up PR.

## Goal

Adopt the stricter Biome linting rules, formatting conventions, custom policies, and TSConfig settings from `.private/web-ce-shared-packages` into the Pawrrtal project. This PR lands the configuration only — the codebase reformat happens in a separate PR.

## Reference

Source of truth: `.private/web-ce-shared-packages/biome.json`, `tsconfig.base.json`, `check-docstrings.mjs`

---

## 1. Biome Configuration

Update root `biome.json` (bump from 2.4.4 to 2.4.8). Update `$schema` URL to match new version.

### Files

Remove the `files.includes` filter entirely. The reference project scopes to `packages/**` because it's a monorepo — Pawrrtal should rely on Biome's default file discovery (respects `.gitignore` via VCS integration). Keep `"ignoreUnknown": false`.

### Formatter

| Setting | Current | Target |
|---------|---------|--------|
| Indent style | tab | space |
| Indent width | (default 2) | 2 |
| Line width | 80 (default) | 100 |
| Quote style | double | single |
| Semicolons | (default) | always |
| Trailing commas | (default) | es5 |

### VCS

Enable git integration:

```json
"vcs": {
  "enabled": true,
  "clientKind": "git",
  "useIgnoreFile": true,
  "defaultBranch": "main"
}
```

### Retained Blocks (no changes)

- **`assist`**: keep existing `organizeImports: "on"`
- **`css.parser.tailwindDirectives`**: keep `true` — required for Tailwind v4, not present in reference (not a Tailwind project)

### Linter Rules

**Domains:**
- `react`: `"all"`

Top-level `"recommended": true` is sufficient — nested `recommended` flags inside `complexity`/`performance`/`security` are inherited and not needed.

**Rules added/changed:**

| Rule | Level | Notes |
|------|-------|-------|
| `complexity/noExcessiveLinesPerFunction` | warn | maxLines: 120 |
| `complexity/noExcessiveCognitiveComplexity` | warn | maxAllowedComplexity: 20 |
| `performance/noImgElement` | off | |
| `performance/useSolidForComponent` | off | |
| `suspicious/noExplicitAny` | error | |
| `suspicious/noArrayIndexKey` | off | |
| `suspicious/noConfusingVoidType` | off | |
| `suspicious/noReactForwardRef` | off | |
| `suspicious/noConsole` | warn | allow: warn, error, group, groupEnd, time, timeEnd, table |
| `correctness/noUnusedVariables` | error | |
| `correctness/useSingleJsDocAsterisk` | warn | |
| `style/useComponentExportOnlyModules` | off | |
| `style/useImportType` | error | |
| `style/useExportType` | error | |
| `style/useConst` | error | |
| `a11y/noStaticElementInteractions` | off | |
| `a11y/noSvgWithoutTitle` | off | |
| `a11y/useKeyWithClickEvents` | off | |
| `security/noDangerouslySetInnerHtml` | warn | |
| `security/noSecrets` | off | |

### Overrides

1. **UI components** (`frontend/components/ui/**`): linter, formatter, assist all disabled (existing)
2. **layout.tsx** (`frontend/app/layout.tsx`): `noDangerouslySetInnerHtml` off (existing)
3. **Test files** (`**/*.test.ts`, `**/*.test.tsx`, `**/*.spec.ts`, `**/*.spec.tsx`, `**/__tests__/**`): relax `noExplicitAny` off, `noConsole` off, `noExcessiveLinesPerFunction` off (new)

---

## 2. TSConfig Changes

### Root `tsconfig.json`

| Setting | Current | Target |
|---------|---------|--------|
| `noUnusedParameters` | false | true |
| `forceConsistentCasingInFileNames` | (absent) | true |

**Deferred:** `noUnusedLocals` stays `false` in this PR. With `verbatimModuleSyntax: true`, enabling it would immediately break `tsc --noEmit` on any non-`import type` usage. The Biome rule `useImportType: error` will catch these once the reformat PR runs. Enable `noUnusedLocals: true` in the reformat PR after all imports are fixed.

### Frontend `tsconfig.json`

No changes. Already has `strict: true`, `noUncheckedIndexedAccess: true`, Next.js plugin.

---

## 3. Custom Policy Checker

Copy `.private/web-ce-shared-packages/check-docstrings.mjs` to Pawrrtal root as `check-policies.mjs`. Then make ONLY these changes:

1. **Scan directory:** Change `collectPackageFiles` to scan `frontend/` instead of `packages/`. The function walks the directory tree — change the root path argument from `path.join(rootPath, 'packages')` to `path.join(rootPath, 'frontend')`.
2. **File filter:** Update `isIncludedFile` to also exclude `frontend/components/ui/**` (matching the Biome override).
3. **Ignore patterns:** Add `.next` to the ignored directories list alongside `node_modules` and `dist`.

The resulting file should be 90%+ identical to the source. Do NOT rewrite the AST parsing logic, the docstring detection, or the output formatting.

**Dependency:** The script uses the `typescript` package for AST parsing. Add `typescript` as a devDependency in root `package.json` (or confirm it's already resolvable via the frontend workspace).

**Policies enforced:**
- All named functions/methods/accessors require JSDoc (warning)
- Max 400 lines per source file (warning)

**Scope:** `frontend/**/*.{ts,tsx}`

**Excluded:**
- `node_modules`, `dist`, `.next`
- Test files (`*.test.*`, `*.spec.*`, `__tests__/`)
- UI components (`frontend/components/ui/**`)

**Non-blocking:** Emits warnings only. Does not fail the lint command.

---

## 4. Justfile & Scripts

### Root package.json

Add script:

```json
"lint:policies": "bun run check-policies.mjs"
```

### Justfile

Update recipes:

```
lint:
    bunx --bun @biomejs/biome check --no-errors-on-unmatched --files-ignore-unknown=true . && bun run lint:policies

lint:fix:
    bunx --bun @biomejs/biome check --write --no-errors-on-unmatched --files-ignore-unknown=true .
```

`lint` becomes a read-only check (+ policies). `lint:fix` keeps the `--write` flag for auto-fixing. `format` and `check` — unchanged.

### Lefthook

No changes. Pre-commit already runs biome check on staged files. Custom policies are non-blocking warnings, no need to gate commits.

### Biome version

Bump `@biomejs/biome` from 2.4.4 to 2.4.8 in frontend `package.json`.

---

## 5. What This PR Does NOT Do

- Does not reformat existing code (separate PR)
- Does not enforce new lint rules on existing code (separate PR)
- Does not add `lint:strict` tiers (keeping it simple)
- Does not change the `.private/web-ce-shared-packages` configs
