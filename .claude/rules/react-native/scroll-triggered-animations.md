---
name: scroll-triggered-animations
paths: ["**/*"]
---

# Scroll-Triggered Animations with Reanimated

When UI elements should appear/disappear or transform based on scroll
position (scroll-to-top buttons, fading headers, parallax effects), use
Reanimated's `useScrollViewOffset` — not `onScroll` events with state
updates. State-driven scroll handlers drop frames because they bridge
to JS on every frame.

## Scroll-to-Top Button (Fade In After Threshold)

```tsx
import Animated, {
  useAnimatedRef,
  useAnimatedStyle,
  useScrollViewOffset,
  withTiming,
} from 'react-native-reanimated';

export default function Page() {
  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  const scrollOffset = useScrollViewOffset(scrollRef);

  /** Fade in after scrolling 600px */
  const buttonStyle = useAnimatedStyle(() => ({
    opacity: withTiming(scrollOffset.value > 600 ? 1 : 0),
  }));

  const scrollToTop = () => {
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  };

  return (
    <>
      <Animated.ScrollView ref={scrollRef}>
        {/* content */}
      </Animated.ScrollView>
      <Animated.View style={[styles.fab, buttonStyle]}>
        <TouchableOpacity onPress={scrollToTop}>
          <Ionicons name="arrow-up" size={24} />
        </TouchableOpacity>
      </Animated.View>
    </>
  );
}
```

## Animated Header (Fade on Scroll with Interpolation)

```tsx
import { interpolate } from 'react-native-reanimated';

const headerStyle = useAnimatedStyle(() => ({
  opacity: interpolate(scrollOffset.value, [0, 500], [0, 1]),
}));
```

Use `interpolate` when you need a gradual transition mapped to scroll
range. Use `withTiming` with a threshold check when you need a binary
appear/disappear.

## Anti-patterns

- Using `onScroll` + `setState` for scroll-based animations — causes JS
  bridge traffic on every frame, drops to ~30 FPS under load
- Using `Animated.event` without `useNativeDriver: true` — same problem
- Forgetting `useAnimatedRef` — a regular `useRef` won't work with
  `useScrollViewOffset`

## Verify

"Are scroll-based animations using Reanimated's `useScrollViewOffset`
(not `onScroll` + setState)? Is `useAnimatedRef` used for the scroll ref?
Are threshold checks using `withTiming` and gradual transitions using
`interpolate`?"

## Patterns

Bad — onScroll + setState drops frames:

```tsx
const [showButton, setShowButton] = useState(false);

<ScrollView onScroll={(e) => {
  setShowButton(e.nativeEvent.contentOffset.y > 600);
}}>
  {/* content */}
</ScrollView>
{showButton && <FabButton />}
```

Good — Reanimated worklet runs on UI thread:

```tsx
const scrollRef = useAnimatedRef<Animated.ScrollView>();
const scrollOffset = useScrollViewOffset(scrollRef);

const buttonStyle = useAnimatedStyle(() => ({
  opacity: withTiming(scrollOffset.value > 600 ? 1 : 0),
}));

<Animated.ScrollView ref={scrollRef}>
  {/* content */}
</Animated.ScrollView>
<Animated.View style={[styles.fab, buttonStyle]}>
  <FabButton />
</Animated.View>
```
