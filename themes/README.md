# Themes

Drop-in DESIGN.md files that the app loads as **theme presets** in
Settings → Appearance.

Each `.md` file in this directory is a [DESIGN.md](https://github.com/google-labs-code/design.md)
spec for a different visual identity (`mistral.md`, `cursor.md`, …). The
`themes:build` script converts them into a typed registry consumed by
`frontend/features/appearance/presets.ts`, which the panel reads to
populate the "Apply preset" picker.

## Workflow

1. Drop a new `.md` file into `themes/` (validate it with
   `bunx @google/design.md lint themes/<name>.md` first if you want).
2. Run `bun run themes:build` from the repo root.
3. The script writes `frontend/features/appearance/presets.generated.ts`
   with one `Preset` entry per file. The Appearance panel exposes them
   under "Theme presets".

## Built-in defaults

The **Mistral** preset is also the system default — when a user has
never customized appearance, they get exactly what `mistral.md` defines.
Adding a new theme does NOT change the default; it only adds another
choice to the picker.

## File format

The build script reads each file's YAML front matter and the prose for
the description / display name:

```yaml
---
version: alpha
name: Mistral AI                 # used as the preset's human label
description: …                   # used as the picker tooltip
colors:
  primary: "#fa520f"
  background: "#fff8e0"
  foreground: "#1f1f1f"
  accent: "#fa520f"              # falls back to `primary` if missing
  info: "#ff8105"                # optional
  success: "#22783c"             # optional — falls back to project default
  destructive: "#cc3a05"         # optional
typography:
  body-md: { fontFamily: Inter, … }     # `display` / `body-md` / `code` slots
  display-lg: { fontFamily: PP Editorial Old, … }
  code: { fontFamily: JetBrains Mono, … }
---
```

The build script extracts the six color slots
(`background`, `foreground`, `accent`, `info`, `success`, `destructive`)
and the three font slots (`display`, `sans`, `mono`). Anything missing
falls back to the AI Nexus default for that slot — partial themes are
fine.
