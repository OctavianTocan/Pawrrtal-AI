---
name: use-native-blur-for-translucent-headers
paths: ["**/*"]
---

# Use Native Blur Effect for Translucent Headers, Not JS-Based Blurs

When a screen has scrollable content under a navigation header, use a
blurred translucent header instead of an opaque one. This is the standard
iOS pattern and looks polished on both platforms.

## Implementation

1. Set `headerBlurEffect` on the Stack.Screen options (e.g. `"regular"`,
   `"light"`, `"dark"`)
2. Set `headerTransparent: true` — blur is invisible without this
3. Compensate for the zero-height transparent header: use the
   `useHeaderHeight()` hook from `@react-navigation/elements` and apply
   it as `paddingTop` on the **ScrollView**, not a wrapper View

```tsx
import { useHeaderHeight } from '@react-navigation/elements';

export default function Page() {
  const headerHeight = useHeaderHeight();

  return (
    <ScrollView contentContainerStyle={{ paddingTop: headerHeight }}>
      {/* content */}
    </ScrollView>
  );
}
```

Stack screen options:

```tsx
<Stack.Screen
  options={{
    headerBlurEffect: 'regular',
    headerTransparent: true,
  }}
/>
```

For Tab or Drawer navigators (where `headerBlurEffect` is not available),
drop an Expo `<BlurView>` directly as a custom header background.

## Verify

"Is the header transparent AND blurred? Is `paddingTop` applied to the
ScrollView (not a parent View)? If using Tabs/Drawer, is a custom BlurView
used instead of the unsupported `headerBlurEffect` prop?"

## Patterns

Bad — opaque header, no blur, content hidden behind it:

```tsx
<Stack.Screen
  options={{
    headerTransparent: true,
    // no headerBlurEffect → header is invisible, content slides under
  }}
/>

// padding on a wrapper View instead of ScrollView → wrong offset
<View style={{ paddingTop: headerHeight }}>
  <ScrollView>{/* content */}</ScrollView>
</View>
```

Good — native blur on Stack navigator:

```tsx
<Stack.Screen
  options={{
    headerBlurEffect: 'regular',
    headerTransparent: true,
  }}
/>

// paddingTop directly on ScrollView contentContainerStyle
<ScrollView contentContainerStyle={{ paddingTop: headerHeight }}>
  {/* content */}
</ScrollView>
```

Good — BlurView fallback for Tab/Drawer:

```tsx
<Stack.Screen
  options={{
    headerTransparent: true,
    headerBackground: () => (
      <BlurView intensity={80} style={StyleSheet.absoluteFill} />
    ),
  }}
/>
```
