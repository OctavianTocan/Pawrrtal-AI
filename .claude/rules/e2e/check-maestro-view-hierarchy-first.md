---
name: check-maestro-view-hierarchy-first
paths: ["**/*.yaml", "**/*.yml", "**/*.{kt,java}"]
---

# Check Maestro View Hierarchy Before Writing Assertions - IDs May Not Be What You Expect

Category: e2e
Tags: [maestro, debugging, accessibility, e2e]

## Rule

Dump `maestro hierarchy` in a debug step before running flows. When flows fail, dump hierarchy again in the `if: always()` diagnostics step.

## Why

Maestro matches elements by accessibility ID (`id:`), text, or resource-id. When an assertion fails ("id: X is not visible"), you need to know what IS visible. Without a hierarchy dump, you're guessing whether the app rendered at all, rendered an error state, or rendered the right content with wrong IDs. A hierarchy dump is 2 seconds and answers all three.

## Examples

### Good

```yaml
- name: 'Debug: pre-test hierarchy'
  run: maestro hierarchy 2>&1 | head -200

- name: Run Maestro flows
  run: maestro test .maestro/flows/

- name: 'Debug: post-failure hierarchy'
  if: always()
  run: maestro hierarchy 2>&1 | head -300
```

## References

- TwinMind E2E: hierarchy dumps revealed surface_list was visible (auth error state), not actual surfaces

## Verify

When a Maestro assertion fails: run `maestro hierarchy` to confirm what elements are actually present and their actual IDs before assuming the app is broken.

## Patterns

### Pattern (bad)

```yaml
# No visibility into what Maestro actually sees
- assertVisible:
    id: "expected_surface"
```

### Pattern (good)

```yaml
# Dump hierarchy first to see what's actually there
- run: maestro hierarchy 2>&1 | head -200
- assertVisible:
    id: "expected_surface"
```
