---
# ai-nexus-s8na
title: 'Whimsy generator: richer motif library + collision-safe placer for recognisable doodles'
status: todo
type: feature
priority: normal
created_at: 2026-05-07T16:29:36Z
updated_at: 2026-05-07T16:29:36Z
---

## Context

The current generator at ``frontend/lib/whimsy-tile.ts`` produces austere output ("small triangles and weird stuff") because two layers are too primitive:

1. **Motif library** is 10 hand-coded SVG paths covering simple geometry only: heart, star, sparkle, plus, diamond, triangle, moon, flower, dot, teardrop. Every motif has bounding-circle radius 1.5–6. There are no recognisable objects (cats, planets, eiffel tower, etc).
2. **Placer** is a rigid ``grid x grid`` cell layout with one motif per cell + small scale/rotation jitter (``WhimsyTileOptions.grid``, lines 285–334). All cells are identical size, motifs all roughly the same scale; output reads as uniform texture.

Reference quality the user wants (see images attached to the spec): **cats-and-dogs doodle pattern**, **Paris/math/Christmas chalkboard pattern**, **space pattern**. Each has 50–150+ distinct line-drawn objects of varied sizes, packed densely without clipping, theme-coherent.

## Goal

A generator that takes a **theme** and produces a tile that — at a glance — reads as that theme's reference. Same parameter axes as today (``seed``, ``density``, ``size``, ``opacity``, ``theme``); upgraded internals.

## Plan

### 1. Build a richer motif library

Two paths, pick the cheaper one in research:

**A. Extract from reference images.** Trace bitmaps to SVG via Potrace (``potrace`` cli, or ``imagetracerjs`` in browser/node); split the resulting SVG into per-glyph ``<path>`` elements; manually clean. Output: a JSON manifest per theme listing ``{ id, paths, bbox, recommendedScale }``.

**B. Hand-curate from open-licensed icon packs.** Sources: noun-project free tier (CC0 only), tabler-icons (MIT), Hugeicons (free tier), or doodle-icons style packs. Audit each for licence; pick a single source per theme to keep visual register coherent.

Per-theme target: 30–60 motifs, mix of small (4u radius), medium (8u), large (14u) so the placer can produce visual hierarchy.

### 2. Bbox, not radius

Today's ``Motif.radius`` (single number) is fine for circle-ish primitives but wastes space for anything elongated (e.g. a leashed dog). Switch to ``bbox: { width, height }`` per motif so packing accounts for actual extent.

### 3. Collision-safe placer

Replace the grid scheme with a **Poisson-disc / packed sampling** algorithm:

- Run a sampler that proposes ``(cx, cy, scale, rotation, motifId)`` candidates.
- Reject any candidate whose rotated bbox overlaps an already-placed bbox (separating-axis test, or simpler AABB-after-rotation if rotations are limited to ``[-15°, 15°]``).
- Stop when ``density × tile_area`` is filled or after ``maxAttempts`` rejections.
- Toroidal wrapping stays — wrap a bbox that crosses any of the 4 edges, same as today's ``wrapOffsets``.

Density now means "fraction of tile area covered by motif bboxes" rather than "cells per row" — a more intuitive knob and one that scales naturally across motif sizes.

### 4. Themes

New themes as published JSON manifests under ``frontend/lib/whimsy-motifs/<theme>.json``:

- ``catsAndDogs`` — sleeping cats, fish bones, dog houses, leashes, paw prints, pet toys.
- ``paris`` — Eiffel tower, Notre Dame, baguettes, Arc de Triomphe, wine glass.
- ``math`` — equations, integrals, geometric solids, sigma, pi.
- ``christmas`` — ornaments, tree, candy cane, snowflakes, gift box.
- ``space`` — astronaut, rocket, planet, UFO, satellite, comet.

The existing ``kawaii``/``cosmic``/``botanical``/``geometric``/``cute``/``minimal``/``playful`` themes stay as the lo-fi geometric tier; new themes coexist.

### 5. Settings UX

- Theme dropdown gets two groups: "Geometric" (current) and "Story" (new doodles).
- Density slider keeps current 3–10 visual semantics but is reinterpreted internally as the area-coverage target.
- Tile size / opacity / seed unchanged.

## Deliverables

- ``frontend/lib/whimsy-motifs/`` directory with one JSON manifest per new theme + a loader.
- ``frontend/lib/whimsy-tile.ts`` upgraded: bbox-based placer with collision detection, toroidal wrap preserved.
- New themes registered in ``WHIMSY_THEMES`` (or a parallel ``WHIMSY_STORY_THEMES``) consumed by the existing settings UI.
- Updated ``frontend/app/dev/whimsy-tile/page.tsx`` browser to preview each new theme.
- Tests:
  - Snapshot test per theme at fixed seed — ensures outputs are deterministic.
  - Property test: 1,000 random seeds, no two motifs overlap (post-rotation bbox).
  - Performance test: tile generation completes <50ms at default settings.
- Documentation in DESIGN.md → Components → Whimsy Texture, with a screenshot per theme.

## Open questions

- Licensing: every imported glyph needs documented provenance + licence note. CC0 / MIT only. No "free for personal use" gotchas.
- Do we want a per-theme background-color suggestion, or stick with the rule "background colour is separate" per the user's note?
- Should the placer support a minimum-distance parameter so users can dial up "breathing room" without dropping density?

## Acceptance

- Picking the ``catsAndDogs`` theme produces a tile that, at thumbnail size, is clearly recognisable as the reference (cats, dog houses, paw prints visible).
- No motif clips into another in any seed.
- Existing geometric themes still render byte-identically (no regression).
- Settings UI shows theme dropdown grouped Geometric / Story.

## Non-goals

- No animation. Tiles stay static images.
- No procedural composition (e.g. building a full doodle by combining smaller parts) — just smarter placement of pre-made glyphs.
- No background colour generator — out of scope per the user's note.

## Todos

- [ ] Pick extraction approach (Potrace vs hand-curate)
- [ ] Catalogue + licence-clear ~40 motifs per new theme
- [ ] Convert to ``frontend/lib/whimsy-motifs/<theme>.json`` manifests
- [ ] Replace ``Motif.radius`` with ``Motif.bbox`` (width × height)
- [ ] Implement bbox-based collision rejection in the placer
- [ ] Wire new themes into ``WHIMSY_THEMES`` + settings dropdown
- [ ] Snapshot + property tests
- [ ] Update dev preview page with new themes
- [ ] DESIGN.md: Whimsy Texture section with per-theme screenshots
