---
name: minimum-tap-target-44pt
paths: ["**/*.{ts,tsx,kt,java,swift}"]
---

# Minimum 44pt Tap Targets for Pressable

Every `Pressable` (and `TouchableOpacity`, `TouchableHighlight`) must have an effective touch area of at least 44×44 points on iOS. Android has a similar 48dp guideline.

## Rule

When the visual size of a button is smaller than 44pt, add `hitSlop` to extend the touch area without changing the layout:

```typescript
const HIT_SLOP = { top: 8, bottom: 8, left: 8, right: 8 };

<Pressable hitSlop={HIT_SLOP} onPress={onPress} style={styles.smallButton}>
  <Icon />
</Pressable>
```

Calculate the slop: `(44 - visualSize) / 2` on each side. For a 32px button that's 6px per side. For a 24px icon-only button that's 10px.

## Why

Buttons below 44pt fail silently on iOS. Taps near the edge don't register — no error, no crash, no feedback. The user thinks the button is broken. This is the most common cause of "buttons don't work" reports in React Native apps.

## Symptoms

- "Left/right arrows don't work on iOS" with no error logs
- Buttons work when tapped dead-center but miss on edges
- Same code works fine on web (web has different hit testing)
- Works in Android but not iOS (Android has slightly more forgiving touch slop)

## Verify

"Does every tappable element have an effective touch area of at least 44×44pt? For small visual buttons, is `hitSlop` calculated as `(44 - visualSize) / 2`?"

## Patterns

Bad — small icon button with no hitSlop:

```tsx
<TouchableOpacity onPress={onPress} style={{ width: 24, height: 24 }}>
  <Icon name="close" size={24} />
</TouchableOpacity>
```

Good — hitSlop extends touch area to 44×44:

```tsx
const HIT_SLOP = { top: 10, bottom: 10, left: 10, right: 10 };

<TouchableOpacity hitSlop={HIT_SLOP} onPress={onPress} style={{ width: 24, height: 24 }}>
  <Icon name="close" size={24} />
</TouchableOpacity>
```
