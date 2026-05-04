---
name: clearstate-needs-app-id
paths: ["**/*.{ts,tsx,kt,swift,gradle,xml}", "**/Podfile", "**/*.xcconfig"]
---

# ClearState Scripts Must Use APP_ID Variable, Not Hardcoded Strings

Maestro `clearState` in config.yaml must use `${APP_ID}`, not a hardcoded bundle ID. Test host apps use a different bundle ID than the production app. A hardcoded `com.company.app` in `clearState` silently clears nothing — the test host's state persists between runs, leaking auth tokens and cached data. Tests appear to pass but are not isolated.

## Verify

"Does my Maestro clearState use ${APP_ID} or a hardcoded bundle ID? If I changed the test host bundle ID, would clearState still work?"

## Patterns

Bad — hardcoded production bundle ID clears wrong app:

```yaml
onFlowStart:
  - clearState: com.twinmind.app  # Wrong app ID for test host
```

Good — uses APP_ID variable matching the test host:

```yaml
onFlowStart:
  - clearState: ${APP_ID}  # Matches -e APP_ID=ai.twinmind.testhost
```

TwinMind Maestro config: clearState pointed at production bundle ID, not test host. Tests silently passed without actual state reset.
