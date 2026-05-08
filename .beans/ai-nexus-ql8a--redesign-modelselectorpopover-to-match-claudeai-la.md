---
# pawrrtal-ql8a
title: Redesign ModelSelectorPopover to match Claude.ai layout
status: completed
type: feature
priority: normal
created_at: 2026-05-04T18:25:10Z
updated_at: 2026-05-04T18:38:35Z
---

Restyle chat composer model selector to mirror claude.ai's design while keeping our existing 4-step Intelligence enum (Low/Medium/High/Extra High). No backend or storage changes.

## Confirmed scope (from grill-me session)
- Stays on Radix DropdownMenu — uses sub-menu, in-menu controls, secondary item descriptions; react-dropdown items-array doesn't fit.
- Reasoning model: KEEP 4-step enum (Option B). Backend untouched. Storage key untouched.
- Visual changes only: trigger shape, item layout with descriptions, primary/more split, reasoning location.

## Open design forks (still grilling)
- Q2: Where does the 4-step reasoning enum live? (its own sub-menu / separate trigger pill / inline segmented control / inline settings row)
- Q3: Which 3 models are primary vs 'more'?
- Q4: Trigger shape (drop the 'Full access' pill from this trigger? where does Full access live?)
- Q5: Item descriptions — copy per model

## Reference
- Target screenshot: claude.ai/new model selector (primary 3 + Adaptive thinking toggle + More models sub-menu)
- Current: frontend/features/chat/components/ModelSelectorPopover.tsx



## Q2 RESOLVED → B1 + 'Thinking' label

- 4-step enum lives in its own sub-menu (mirrors 'More models' sub-menu pattern).
- Label changes from 'Intelligence' to 'Thinking' (closer to Claude's 'Adaptive thinking' vocabulary, accurately describes what the level controls).
- Layout: [primary 3 models] / [Thinking: Medium ›] / [More models ›]
- Implementation: existing DropdownMenuSub/SubTrigger/SubContent — just reshuffled. No new primitives.



## Q3 RESOLVED → provider-grouped tree (NOT primary/more split)

User clarified via Craft Agents reference screenshot. New structure:

```
Main popover (Anthropic visual style — clean white, soft shadow):
  Anthropic           ›  → sub-menu: Opus 4.7, Sonnet 4.6, Haiku 4.5
  OpenAI              ›  → sub-menu: GPT-5.5, GPT-5.4
  Google              ›  → sub-menu: Gemini 3 Flash Preview, Gemini 3.1 Flash Lite Preview
  ─────
  Thinking: Medium    ›  → sub-menu: Low, Medium, High, Extra High
                          (with 'Extended reasoning depth' secondary line)
```

Old α/β/γ split is dead — there is NO 'primary vs more models' distinction. Every model lives inside its provider's sub-menu.

## Open forks remaining
- Q3b: Section headers above provider rows (ALL CAPS like image 18) — yes/no? (Probably no; only 3 providers, over-engineered.)
- Q3c: Active provider indicator (checkmark on the provider row whose model is currently selected, or none?)
- Q4: Trigger pill simplification — drop 'Full access' and 'Medium', show only model short name?
- Q5: Item descriptions per Anthropic visual style — subtle right-aligned secondary text or none?
- Q6: Sub-menu open direction — left of main popover (claude.ai) or right (Craft Agents image 18)?



## Summary of Changes

**File:** `frontend/features/chat/components/ModelSelectorPopover.tsx` (full rewrite, same exports/types)

### What shipped
- **Provider-grouped tree** at top level. Three sub-menus: Anthropic / OpenAI / Google. Each opens to its full model list. Active provider gets a checkmark on the row (matches Craft Agents image 18 z.ai ✓ pattern).
- **'Thinking' sub-menu** at the bottom. Two-line cell:
  - Line 1: `Thinking: {currentLabel}` (e.g. 'Thinking: Medium')
  - Line 2: `Extended reasoning depth` (muted secondary)
  - Sub-content: 4 reasoning levels with checkmark for active.
- **No section headers** (over-engineered for 3 providers).
- **No new dependencies.** Stays on Radix DropdownMenu — pre-existing primitives, just reorganized.
- **Trigger pill unchanged** — still shows `{shortName} {reasoningLabel}`. Only menu content changed.
- Reordered `MODEL_OPTIONS` to declare Anthropic first (signal), then OpenAI, then Google — matches the new visual order.

### Backend untouched
- 4-step `ChatReasoningLevel` enum unchanged. Storage keys unchanged. `DEFAULT_CHAT_MODEL_ID = 'gemini-3-flash-preview'` unchanged.

### Validated
- `bun run typecheck` ✅ clean
- `bun run build` ✅ all 8 routes compile

### Out of scope (deferred for follow-up beans on request)
- react-dropdown package adoption — fully scrapped for this menu (sub-menus + Switch toggle + secondary descriptions don't fit the items-array API). Original pawrrtal-6d31 bean's scope is now uncertain — only ChatComposerControls.tsx might remain a viable candidate, but with separators between mode groups, also marginal. Recommend: don't install react-dropdown until a clean candidate appears.
- Composer 'Full access' pill (separate component / safety mode) — not part of this redesign.
- Per-model descriptions ('Most capable for ambitious work' style) — Anthropic visual style chosen leaves these out for cleaner menu.



## Q5 RESOLVED → A (descriptions on model rows inside provider sub-menus)

Added `description: string` field to `ChatModelOption`. Each model row in the sub-menu is now a two-line cell (matches Claude.ai image 16 + the existing Thinking sub-trigger pattern):

- Line 1: model short name (`text-foreground`)
- Line 2: tagline (`text-[11px] text-muted-foreground`)
- Active model: checkmark on the right, vertically centered with the cell

Sub-menu width grown from `min-w-44` (~176px) to `min-w-64` (~256px) to fit descriptions without truncation.

### Copy shipped (single source of truth in MODEL_OPTIONS)
- Claude Opus 4.7 — Most capable for ambitious work
- Claude Sonnet 4.6 — Balanced for everyday tasks
- Claude Haiku 4.5 — Fastest for quick answers
- GPT-5.5 — OpenAI's flagship reasoning
- GPT-5.4 — Faster GPT for everyday tasks
- Gemini 3 Flash — Google's frontier multimodal
- Gemini Flash Lite — Light and fast Gemini

Cheap to revise — change the description field on any MODEL_OPTIONS entry.

### Validated
- typecheck ✅
- build ✅
- biome format ✅
