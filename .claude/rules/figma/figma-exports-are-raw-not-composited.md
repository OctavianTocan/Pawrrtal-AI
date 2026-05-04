---
name: figma-exports-are-raw-not-composited
paths: ["**/*.{ts,tsx,css}"]
---

# Figma Asset Exports Are RAW (No Background Compositing) - Apply Blend Modes Manually

Figma's MCP asset exports are RAW source images, not the composited result.
Figma applies opacity, blend modes, and base fill colors that drastically
change the final appearance. Using the raw image at 100% opacity will always
be too bright.

## Reverse-Engineer the Compositing

1. Download the Figma baseline via the Images API or `figma-update-baselines.sh`
2. Sample pixel values from the baseline at background-only areas (avoid UI elements)
3. Sample the same logical positions from the raw source image
4. Calculate: `opacity = (figma_pixel - base_color) / (raw_pixel - base_color)`
5. Sample at MULTIPLE positions (center, right edge, top, bottom) — edges
   have natural vignetting that biases the calculation toward darker values

## Verify

"Is a Figma background image being used at 100% opacity? Was the compositing
reverse-engineered by sampling the actual Figma baseline pixels? Were samples
taken from multiple positions to avoid edge bias?"

## Patterns

Bad — raw export used directly at 100% opacity:

```tsx
<img src="/figma-export/background.png" className="absolute inset-0 w-full h-full" />
// Way too bright — Figma composited this with opacity and blend modes
```

Good — reverse-engineer opacity and apply CSS blend mode:

```tsx
<img
  src="/figma-export/background.png"
  className="absolute inset-0 w-full h-full"
  style={{ opacity: 0.35, mixBlendMode: 'multiply' }}
/>
// Opensity and blend mode calculated from Figma baseline pixel sampling
```
