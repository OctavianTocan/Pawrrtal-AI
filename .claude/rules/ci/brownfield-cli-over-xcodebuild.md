---
name: brownfield-cli-over-xcodebuild
paths: [".no-match"]
---

# Brownfield CLI Over Raw xcodebuild

For React Native brownfield iOS builds, always use the `@callstack/react-native-brownfield` CLI. Raw xcodebuild fails because prebuilt pods don't expose `RCTDefaultReactNativeFactoryDelegate`.

## Rule

The brownfield CLI handles build settings, framework search paths, and module visibility that raw xcodebuild gets wrong. Attempting to replicate the CLI's behavior manually leads to an endless chain of Swift module visibility errors.

## Bad

```yaml
- run: xcodebuild -workspace ios/App.xcworkspace -scheme BrownfieldLib ...
```

## Good

```yaml
- run: npx react-native-brownfield build ios --scheme BrownfieldLib --extra-params "CODE_SIGNING_ALLOWED=NO"
```

## Why

Two full days were spent debugging raw xcodebuild failures: pinning Xcode versions, patching `internal import` directives, adjusting framework search paths. The brownfield CLI handles all of this internally. The library's own CI uses the CLI, not raw xcodebuild.

## Verify

"Is the iOS build step using `npx react-native-brownfield build ios` instead of raw `xcodebuild`? Are all required flags (scheme, code signing) passed through `--extra-params`?"

## Patterns

Bad — manually replicating what the CLI does:

```yaml
# Each of these requires separate debugging when they fail
- run: xcodebuild -workspace App.xcworkspace -scheme BrownfieldLib -configuration Release
  # Fails: module 'React' not found
- run: xcodebuild -workspace App.xcworkspace -scheme BrownfieldLib OTHER_LDFLAGS="-lReactNative"
  # Fails: Cannot find type 'RCTDefaultReactNativeFactoryDelegate' in scope
- run: xcodebuild -workspace App.xcworkspace -scheme BrownfieldLib FRAMEWORK_SEARCH_PATHS="..."
  # Fails: another missing build setting — endless chain
```

Good — let the CLI handle everything:

```yaml
- name: Build brownfield iOS framework
  run: |
    npx react-native-brownfield build ios \
      --scheme BrownfieldLib \
      --extra-params "CODE_SIGNING_ALLOWED=NO"
  # CLI handles framework search paths, module visibility, and linking
```
