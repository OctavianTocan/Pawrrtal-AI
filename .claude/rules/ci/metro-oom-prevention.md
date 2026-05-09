---
name: metro-oom-prevention
paths: [".no-match"]
---
# Prevent Metro OOM in CI

Metro bundler can OOM during large React Native builds in CI where memory
is constrained. Set `NODE_OPTIONS=--max-old-space-size=4096` before any
Metro invocation.

## Verify

"Could Metro OOM in this CI environment? Is NODE_OPTIONS set?"

## Patterns

Bad — Metro killed by OOM on large bundles:

```yaml
- run: npx react-native bundle --platform android --dev false
```

Good — memory limit prevents OOM:

```yaml
- run: npx react-native bundle --platform android --dev false
  env:
    NODE_OPTIONS: "--max-old-space-size=4096"
```
