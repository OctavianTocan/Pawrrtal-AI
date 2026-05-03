---
name: android-accessibility-id-underscores
paths: ["**/*.yaml", "**/*.yml", "**/*.{kt,java}"]
---

# Android Accessibility IDs with Underscores Can Fail in Maestro - Use Hyphens

Category: e2e
Tags: [maestro, android, accessibility, resource-id]

## Rule

Use underscores in accessibility IDs shared across platforms. Android resource-ids can't contain hyphens; Maestro's `id:` matcher uses `resource-id` on Android and `accessibilityIdentifier` on iOS.

## Why

An `id: "surface-list"` Maestro assertion works on iOS (accessibilityIdentifier allows hyphens) but fails silently on Android (resource-ids use underscores). Android XML `android:id` gets prefixed as `package:id/surface_list`. Use underscores everywhere for cross-platform Maestro flows.

## Examples

### Bad

```yaml
# Works on iOS, fails on Android
- assertVisible:
    id: "surface-list"
```

### Good

```yaml
# Works on both platforms
- assertVisible:
    id: "surface_list"
```

## References

- TwinMind E2E: `surface-list` worked on iOS but not Android, fixed to `surface_list`

## Verify

When a Maestro flow passes on iOS but fails on Android: check if accessibility IDs use hyphens instead of underscores. Resource-ids on Android only allow underscores.

## Patterns

### Pattern (bad)

```yaml
# iOS passes, Android fails
- assertVisible:
    id: "surface-list"
```

### Pattern (good)

```yaml
# Works on both platforms
- assertVisible:
    id: "surface_list"
```
