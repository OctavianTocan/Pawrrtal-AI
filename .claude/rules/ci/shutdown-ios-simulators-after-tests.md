---
name: shutdown-ios-simulators-after-tests
paths: [".github/workflows/*.{yml,yaml}", "Dockerfile", "**/*.sh"]
---

# Shut Down iOS Simulators After E2E Tests to Free Resources for Next Run

Category: ci
Tags: [ci, ios, simulator, self-hosted, cleanup]

## Rule

Shut down iOS simulators and kill Android emulators in `if: always()` steps. Delete unavailable simulators to prevent disk leak on persistent runners.

## Why

Self-hosted runners persist state between runs. A left-running simulator accumulates installed apps, logs, and cache. Over weeks, this consumes tens of GB. The emulator's `nohup` process outlives the job if `adb emu kill` isn't called. `xcrun simctl delete unavailable` cleans up phantom simulators from Xcode upgrades.

## Examples

### Good

```yaml
- name: Shutdown simulator
  if: always()
  run: |
    xcrun simctl shutdown "$SIM_NAME" 2>/dev/null || true
    xcrun simctl delete unavailable 2>/dev/null || true

- name: Kill emulator
  if: always()
  run: |
    "$ADB" emu kill 2>/dev/null || true
```

## References

- a prior E2E project: iOS job lacked simulator cleanup, Android had emulator kill

## Verify

"Is there an `if: always()` cleanup step that shuts down simulators and deletes unavailable ones?"

## Patterns

Bad — no cleanup after E2E tests:

```yaml
- name: Run E2E tests
  run: |
    xcrun simctl boot "iPhone 15"
    npm run test:e2e
    # Simulator stays booted, apps accumulate, disk fills over weeks
    # Next run may fail due to leftover state
```

Good — always cleanup in `if: always()` step:

```yaml
- name: Run E2E tests
  run: |
    xcrun simctl boot "iPhone 15"
    npm run test:e2e

- name: Cleanup simulators
  if: always()  # Runs even if tests fail
  run: |
    xcrun simctl shutdown all 2>/dev/null || true
    xcrun simctl delete unavailable 2>/dev/null || true
```
