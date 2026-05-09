---
name: dynamic-ios-simulator-detection
paths: [".no-match"]
---

# Dynamically Find Available iOS Simulator Runtime and Device ID

Category: ci
Tags: [ci, ios, simulator, self-hosted]

## Rule

Detect available iOS simulators dynamically — never hardcode device names like "iPhone 16 Pro".

## Why

Xcode 26.4 ships iPhone 17 series, not iPhone 16. Xcode 27 will ship something else. Hardcoded device names break on every Xcode update. Dynamic detection ensures CI always finds a valid simulator regardless of Xcode version.

## Examples

### Bad

```bash
# Breaks when Xcode updates ship different simulator names
xcodebuild -destination "platform=iOS Simulator,name=iPhone 16 Pro,OS=18.0" build
```

### Good

```bash
SIM_NAME=$(xcrun simctl list devices available -j | python3 -c "
import json, sys
data = json.load(sys.stdin)
for rt, devs in data['devices'].items():
    for d in devs:
        if d['isAvailable'] and 'iPhone' in d['name']:
            print(d['name'], end='')
            sys.exit(0)

")
xcodebuild -destination "platform=iOS Simulator,name=$SIM_NAME,OS=latest" build
```

## References

- brownfield-native-test-hosts skill: iOS CI pitfall #1
- Maestro E2E mobile skill: Detect simulator dynamically

## Verify

"Does the CI script probe for available simulators dynamically? Could a hardcoded device name break after an Xcode update?"

## Patterns

Bad — hardcoded simulator name:

```bash
xcodebuild -destination "platform=iOS Simulator,name=iPhone 16 Pro,OS=18.0" build
# Breaks on Xcode 26.4 which ships iPhone 17 series, not iPhone 16
# Error: "The destination is invalid"
```

Good — dynamic detection via simctl:

```bash
SIM_NAME=$(xcrun simctl list devices available -j | python3 -c "
import json, sys
data = json.load(sys.stdin)
for rt, devs in data['devices'].items():
    for d in devs:
        if d['isAvailable'] and 'iPhone' in d['name']:
            print(d['name'], end='')
            sys.exit(0)
")
xcodebuild -destination "platform=iOS Simulator,name=$SIM_NAME,OS=latest" build
# Always finds an available iPhone simulator regardless of Xcode version
```
