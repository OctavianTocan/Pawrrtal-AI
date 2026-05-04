---
name: bundle-js-into-aar
paths: [".github/workflows/*.{yml,yaml}", "Dockerfile", "**/*.sh"]
---

# Bundle JavaScript Into the Brownfield AAR, Not as a Separate Asset

Category: ci
Tags: [android, react-native, brownfield, aar, js-bundle]

## Rule

Explicitly bundle the JS with `expo export:embed` into the brownfield AAR's assets directory before Gradle builds. Native surface mounting ≠ JS rendering.

## Why

The brownfield Android packaging does not automatically include the JS bundle in the AAR. The native SurfaceActivity will mount successfully, Auth0 tokens will be acquired, logcat shows "Surface mounted successfully" — but the RN content never renders because there's no `index.android.bundle` in the APK's assets. iOS brownfield packaging handles this automatically via XCFramework, but Android requires explicit bundling.

## Examples

### Bad

```yaml
# AAR builds without JS bundle — native works, RN is blank
- run: |
    npx expo prebuild --platform android --no-install
    ./gradlew publishToMavenLocal
```

### Good

```yaml
- run: |
    npx expo prebuild --platform android --no-install
    # Bundle JS into AAR assets BEFORE gradle build
    pnpm exec expo export:embed \
      --platform android --dev false \
      --entry-file entry.tsx \
      --bundle-output "$MODULE_DIR/src/main/assets/index.android.bundle" \
      --assets-dest "$MODULE_DIR/src/main/res"
    ./gradlew publishToMavenLocal
```

## Verify

"After the AAR build, does the archive contain `assets/index.android.bundle`? Can you verify with `jar tf module.aar | grep bundle`?"

## Patterns

Bad — assuming bundling happens automatically:

```yaml
# iOS handles JS bundling automatically in the brownfield XCFramework
# Android does NOT — must be explicit
- run: |
    npx expo prebuild --platform android --no-install
    ./gradlew publishToMavenLocal
  # AAR contains no JS — native mounts but RN renders blank
```

Good — explicit JS bundling before Gradle:

```yaml
- name: Bundle JS into AAR assets
  run: |
    mkdir -p "$MODULE_DIR/src/main/assets"
    pnpm exec expo export:embed \
      --platform android --dev false \
      --entry-file entry.tsx \
      --bundle-output "$MODULE_DIR/src/main/assets/index.android.bundle" \
      --assets-dest "$MODULE_DIR/src/main/res"

- name: Verify bundle exists
  run: ls -la "$MODULE_DIR/src/main/assets/index.android.bundle"

- name: Build AAR
  run: ./gradlew publishToMavenLocal
```

## References

- TwinMind E2E: Android surfaces mounted (logcat confirmed), but 3/3 Maestro flows failed because RN JS never loaded
