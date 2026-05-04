---
name: safe-area-android-brownfield
paths: ["**/*.{ts,tsx,kt,swift,gradle,xml}", "**/Podfile", "**/*.xcconfig"]
---

# Wrap all brownfield surfaces with SafeAreaView on Android

Android brownfield activities render React Native content at coordinates (0,0), which means the status bar and navigation bar overlap content. iOS handles this via the native host's safe area layout guide, but Android brownfield activities don't account for system bar insets. Every brownfield surface needs `SafeAreaProvider` + `SafeAreaView` from `react-native-safe-area-context`.

## Verify

"Does every brownfield surface component wrap its content in a SafeAreaView? Is SafeAreaProvider at the root?"

## Patterns

Bad — content clipped by status bar on Android:

```tsx
export function BrownfieldSurface(props: Props): JSX.Element {
  return (
    <AppProviders>
      <Screen />  {/* Clipped by status bar on Android */}
    </AppProviders>
  );
}
```

Good — SafeAreaProvider + SafeAreaView wraps the surface:

```tsx
export function BrownfieldSurface(props: Props): JSX.Element {
  return (
    <SafeAreaProvider>
      <SafeAreaView style={{ flex: 1 }}>
        <AppProviders>
          <Screen />
        </AppProviders>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
```
