---
name: use-native-ios-large-collapsible-header
paths: ["**/*"]
---

# Use Native iOS Large Collapsible Header Instead of Custom Animation

When a screen needs a prominent title (settings, profile, list pages), use
the native iOS large header instead of building a custom collapsible header.
It handles the collapse/expand animation, pull-to-stretch, and snap behavior
for free.

## Implementation

1. Enable `headerLargeTitle: true` on Stack.Screen options
2. Set `headerLargeTitleShadowVisible: false` to remove the border in
   expanded state (keeps it when collapsed — feels more natural)
3. Match the header background color to the page background so the
   transition between expanded and collapsed is seamless
4. On the page's ScrollView, set `contentInsetAdjustmentBehavior="automatic"`
   — this fixes content offset and eliminates snapping

```tsx
<Stack.Screen
  options={{
    headerLargeTitle: true,
    headerLargeTitleShadowVisible: false,
    headerShadowVisible: false,
    headerStyle: { backgroundColor: '#f5f5f5' },
    headerLargeTitleStyle: { color: '#000' },
  }}
/>
```

Page ScrollView:

```tsx
<ScrollView contentInsetAdjustmentBehavior="automatic">
  {/* content */}
</ScrollView>
```

## Verify

"Does the ScrollView have `contentInsetAdjustmentBehavior='automatic'`?
Does the header background color match the page background? Is the large
title shadow disabled for a clean expanded state?"

## Patterns

Bad — custom animated header with Animated.Value:

```tsx
// Custom collapsible header using Animated — lots of code, janky on iOS
const scrollY = useRef(new Animated.Value(0)).current;
const headerHeight = scrollY.interpolate({
  inputRange: [0, 120],
  outputRange: [200, 100],
  extrapolate: 'clamp',
});

<Animated.View style={{ height: headerHeight }}>
  <Text style={styles.largeTitle}>Title</Text>
</Animated.View>
<Animated.ScrollView onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }])}>
  {/* content */}
</Animated.ScrollView>
```

Good — native large title with zero animation code:

```tsx
<Stack.Screen
  options={{
    headerLargeTitle: true,
    headerLargeTitleShadowVisible: false,
    headerShadowVisible: false,
    headerStyle: { backgroundColor: '#f5f5f5' },
  }}
/>

<ScrollView contentInsetAdjustmentBehavior="automatic">
  {/* content */}
</ScrollView>
```
