---
name: set-up-pixel-diff-before-iterating-visually
paths: ["**/*.{ts,tsx,css}"]
---

# Set Up Pixel Diff Comparison Before Iterating on Visual Tweaks - Without It You're Flying Blind

When implementing a Figma design, set up pixelmatch comparison BEFORE
iterating on visual tweaks. Without objective diff percentages, you waste
iterations guessing. The regression pipeline turns "it looks off" into
"27.88% diff, buttons shifted 15px down."

## Required Setup Order

1. Download Figma baseline via Images API (requires FIGMA_PAT)
2. Take a screenshot of the implementation at the same pixel dimensions
3. Run pixelmatch comparison to get the diff percentage
4. Fix the highest-impact differences first (background > layout > details)
5. Re-run after each change to verify improvement

## Verify

"Is there a pixelmatch comparison pipeline set up before making visual
adjustments? Are changes being verified with objective diff percentages
rather than visual guessing?"

## Patterns

Bad — iterating on visuals without measurement:

```text
1. Change background opacity
2. "Looks closer"
3. Adjust padding
4. "Still off"
5. Tweak font size
6. "Maybe?"
// No way to know if changes help or hurt
```

Good — pixel diff guides each iteration:

```bash
# Baseline comparison
pixelmatch baseline.png screenshot.png diff.png 390 844
# 27.88% diff → buttons shifted 15px down, background too bright

# After fixing button position:
pixelmatch baseline.png screenshot.png diff.png 390 844
# 12.34% diff → background opacity still wrong

# After fixing background:
pixelmatch baseline.png screenshot.png diff.png 390 844
# 2.1% diff → within acceptable threshold
```
