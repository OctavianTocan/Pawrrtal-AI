---
# pawrrtal-7rsp
title: 'Whimsy: gradient backgrounds + per-tile color customization (Telegram parity)'
status: todo
type: feature
priority: normal
created_at: 2026-05-07T17:25:57Z
updated_at: 2026-05-07T17:25:57Z
---

## Goal

Telegram chat backgrounds combine three layers: a **gradient/solid background colour**, an **SVG pattern** masked over it, and the user can pick the **pattern tint** independently. Bring that to Pawrrtal's whimsy texture so users can build a fully customised chat background.

Today the whimsy texture only renders one of these layers — the SVG mask, tinted with ``currentColor`` (theme foreground). The chat panel's background colour is fixed by the active palette.

## Three new knobs

### 1. Background colour / gradient

A new layer beneath the whimsy mask:

- ``solid`` — single colour from the palette (or a freeform colour picker).
- ``gradient-2`` — two-stop linear gradient. Picker for direction (e.g. 8 cardinal/ordinal angles) and the two stops.
- ``gradient-4`` — four-stop "Telegram-style" mesh-ish gradient (CSS ``conic-gradient`` or stacked radials approximating it). 4 colours.

### 2. Tile tint

Decouple the SVG mask colour from ``currentColor``. Today the mask is drawn in ``text-foreground`` (driven by theme tokens). New options:

- ``auto`` — current behaviour (theme foreground).
- ``custom`` — freeform colour picker that overrides the mask tint.

### 3. Tile blend

How the mask layer composites onto the gradient. Default ``normal``; offer ``multiply`` / ``screen`` / ``overlay`` for the kinds of effects Telegram's "lighten" and "darken" toggles produce.

## UI shape (Settings → Appearance → Whimsy)

Order of rows, all gated by ``mode === 'preset'`` AND ``enabled``:

1. Source toggle (already there)
2. Preset thumbnail grid (already there)
3. Tile scale slider (already there, as of pawrrtal-s8na latest)
4. **NEW:** Background colour — a tab-row picker: ``Solid`` / ``2-stop gradient`` / ``4-stop gradient``. Below: the relevant pickers.
5. **NEW:** Tile tint — ``Theme`` / ``Custom`` (with picker).
6. **NEW:** Tile blend — chip row with ``Normal`` / ``Multiply`` / ``Screen`` / ``Overlay``.
7. Opacity (already there)

For ``generated`` mode the new background-colour controls also apply (a procedurally-tiled mask over a gradient is just as valid). Tile tint applies the same way.

## Storage shape

Extend ``WhimsyConfig``:

```ts
interface WhimsyConfig {
  // ...existing fields...
  background:
    | { kind: 'solid';      color: string }
    | { kind: 'gradient2'; angle: number; stops: [string, string] }
    | { kind: 'gradient4'; colors: [string, string, string, string] };
  tint: { kind: 'theme' } | { kind: 'custom'; color: string };
  blend: 'normal' | 'multiply' | 'screen' | 'overlay';
}
```

Validator must reject unknown ``kind`` strings and out-of-range hex.

## Rendering

The current single overlay div becomes two stacked layers:

```tsx
<div className="absolute inset-0 ...">
  {/* layer 1: background gradient or solid */}
  <div className="absolute inset-0" style={backgroundStyleFromConfig(config)} />
  {/* layer 2: tile mask */}
  <div className="absolute inset-0" style={{
    backgroundColor: tintColor,
    maskImage: cssUrl,
    maskSize,
    maskRepeat: 'repeat',
    mixBlendMode: config.blend === 'normal' ? undefined : config.blend,
    opacity: config.opacity,
  }} />
</div>
```

For generated mode, layer 2 is unchanged. For preset mode, layer 1 + layer 2 stack as described.

## Color-picker primitive

We don't have a colour picker primitive yet (the appearance section uses pre-canned palette pills). Two options:

- Use ``react-colorful`` (small MIT-licensed picker).
- Build a minimal hex-input + swatch-row primitive ourselves.

The user mentioned in the same conversation that they want a profile-picture upload, so ``react-colorful`` would also serve a future "tint your avatar's background" feature. Lean toward adding the dep.

## Acceptance

- Gradient knobs change the chat panel background live.
- Tile tint knob changes the mask colour live.
- Combinations the user described (Telegram-style gradient + tile + custom tile colour) all reachable from the settings panel.
- Existing whimsy users (generated mode) see no change unless they opt in.
- Persisted config is forward-compatible — new fields fall through to defaults if missing.

## Non-goals

- Animating the gradient (Telegram's animated gradient backgrounds are a phase-2 nice-to-have).
- Per-conversation background overrides (single global setting for now).
- Image-upload backgrounds (use a preset SVG or generated tile, not a user-uploaded JPG).

## Todos

- [ ] Add ``WhimsyConfig`` fields + validator updates
- [ ] Build / vendor a colour picker primitive
- [ ] Render two-layer overlay (background + masked tile)
- [ ] Add the three new SettingsRows to ``WhimsySettingsCard``
- [ ] Test gradient + tile combos at low/high opacity to ensure neither layer washes out the other
- [ ] DESIGN.md → Components → Whimsy Texture entry update

## Related

- pawrrtal-s8na (whimsy generator) — this builds on the preset-mode plumbing landed there.
- Tile scale slider already shipped in commit ``0ceb73c``.
