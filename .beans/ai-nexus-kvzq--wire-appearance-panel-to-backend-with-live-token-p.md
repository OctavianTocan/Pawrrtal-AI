---
# pawrrtal-kvzq
title: Wire Appearance panel to backend with live token propagation + Mistral defaults
status: completed
type: feature
priority: high
created_at: 2026-05-05T16:51:51Z
updated_at: 2026-05-05T17:09:20Z
---

End-to-end appearance system: backend model + API for per-user theme overrides, frontend ThemeProvider that injects CSS vars onto :root, refactor settings/AppearanceSection to write through Query mutation, default values = Mistral-inspired tokens already in globals.css. Includes opportunistic UI polish per userinterface-wiki rules and electron-store CJS regression fix.

## Checklist

### 0. Electron store CJS fix
- [x] Pin electron-store@^8.2.0 (last CJS-compatible release; v9+ is ESM-only)
- [x] Reinstall, rebuild — `electron/dist/lib/typed-store.js` now does CJS require against v8

### 1. Backend appearance API
- [x] Add UserAppearance model (light/dark/fonts/options JSON columns)
- [x] Alembic migration `007_add_user_appearance.py`
- [x] Pydantic schemas: ThemeColors, AppearanceFonts, AppearanceOptions, AppearanceSettings
- [x] CRUD module `app/crud/appearance.py` (get/upsert/reset)
- [x] GET/PUT/DELETE /api/v1/appearance route
- [x] 5 backend pytest cases on the CRUD service (141/141 backend tests pass)

### 2. Frontend appearance pipeline
- [x] features/appearance/ module: types, defaults, merge, queries, AppearanceProvider, index
- [x] DEFAULT_APPEARANCE = Mistral OKLCH tokens that mirror globals.css
- [x] AppearanceProvider injects all 6 color slots + 3 font stacks + --font-size-base + dark class onto <html>
- [x] Mounted inside QueryClientProvider in app/providers.tsx
- [x] Hooks: useAppearance, useUpdateAppearance, useResetAppearance with optimistic updates

### 3. Wire AppearanceSection
- [x] Live mutation pipeline replaces all local state in AppearanceSection
- [x] DEFAULT_APPEARANCE imported from the feature module — no more #FF6363 placeholders
- [x] Debounced (250ms) text inputs for color hex + font family; toggles + slider commit immediately
- [x] Reset button hits DELETE /api/v1/appearance and resets the cache

### 4. Opportunistic UI polish (userinterface-wiki rules)
- [x] Theme toggle uses 150ms ease-out (within duration-press-hover 120-180ms)
- [x] Tabular nums on contrast counter, ui_font_size input, and color hex fields
- [x] Cards reuse SettingsCard with consistent rounded radius; toggle group has nested rounded-[6px] inside rounded-[8px]

## Summary of Changes
(filled at completion)

## Summary of Changes

### Electron fix
- Pinned `electron-store` from `^10.1.0` → `^8.2.0` (last CJS-compatible release).
- Updated `electron/src/lib/typed-store.ts`: dropped the unsupported `projectName` option from v8s `Options<T>`; refreshed the docstring.

### Backend appearance API
- New table `user_appearance` (1:1 with user) — `alembic/versions/007_add_user_appearance.py`.
- New ORM model `UserAppearance` in `backend/app/models.py`.
- New Pydantic schemas: `ThemeColors`, `AppearanceFonts`, `AppearanceOptions`, `AppearanceSettings`.
- New CRUD module `backend/app/crud/appearance.py` (get/upsert/reset).
- New API router `GET/PUT/DELETE /api/v1/appearance` in `backend/app/api/appearance.py`.
- Wired into `backend/main.py`. 5 pytest cases on the CRUD service. 141/141 backend tests pass.

### Frontend appearance pipeline
- New module `frontend/features/appearance/` with types, defaults (Mistral OKLCH tokens), merge, queries, AppearanceProvider, public index.
- `AppearanceProvider` reads `useAppearance()`, merges with defaults, and writes resolved values onto `<html>` CSS custom properties (active-mode color slots + font stacks + `--font-size-base` + `.dark` class + `data-pointer-cursors`).
- Mounted inside `QueryClientProvider` in `app/providers.tsx` so every surface picks up the resolved tokens.

### AppearanceSection rewrite
- `frontend/features/settings/sections/AppearanceSection.tsx` now reads `useAppearance` and dispatches `useUpdateAppearance` / `useResetAppearance`.
- All 6 color slots × 2 themes editable with debounced 250ms commits. Three font slots editable. Theme mode toggle, contrast slider, UI font size, pointer-cursors, translucent-sidebar all live.
- Reset button hits `DELETE /api/v1/appearance`.
- 5 component tests (incl. PUT/DELETE assertions) — all green.

### UI polish
- Theme toggle transitions: 150ms ease-out (`duration-press-hover` rule).
- Tabular nums on numeric values (`type-tabular-nums-for-data`).
- `aria-label` + `role="toolbar"` on the theme switcher.
- Inline placeholders show the default value so clearing a field reverts to default.

### Verification
- Backend: `uv run pytest` → 141 passed.
- Frontend: `bunx vitest run` → 76 files, 324 tests passed.
- Types: `bunx tsc --noEmit` → exit 0.
- Lint: `bunx biome check` → 0 errors, 2 cognitive-complexity warnings (acceptable for the settings panel).
- Design: `bun run design:lint DESIGN.md` → 0 errors, 0 warnings.
- Electron: `bun run build` clean, 45/45 vitest pass.

### Deferred
- Broad userinterface-wiki audit across non-appearance surfaces (animations on nav-chats, chat composer, onboarding) — flagged for follow-up beans, kept out of this PR to keep scope reviewable.
- Local DB has migration 006 already applied; user should run `alembic upgrade head` against a fresh DB or stamp existing local state to pick up 007.
