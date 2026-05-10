---
name: put-gradle-api-calls-inside-dependencies-block
paths: [".no-match"]
---

# Gradle api() Calls Fail When Injected Outside the dependencies {} Block - Check Scope

## Explanation

Gradle Kotlin DSL functions like `api()`, `implementation()`, `embed()` are only valid inside a `dependencies {}` block. Appending them to the end of `build.gradle.kts` with `echo >> file` puts them at the top-level scope where they fail with "none of the following candidates is applicable." Use `sed` to insert after the last existing dependency line, keeping new declarations inside the block.

## Verify

When injecting dependencies via CI scripts: do the new lines end up inside the `dependencies {}` block, not appended to EOF?

## Patterns

Bad — append to EOF outside dependencies block:

```bash
# Appends to EOF — outside dependencies block
{
  echo '    api("com.example:lib:1.0")'
} >> "$MODULE_GRADLE"
```

Good — insert after last dependency line:

```bash
# Find last dependency line and insert after it
LAST_DEP=$(grep -n 'api\|embed\|implementation' "$MODULE_GRADLE" | tail -1 | cut -d: -f1)
sed -i "${LAST_DEP}a\    api(\"com.example:lib:1.0\")" "$MODULE_GRADLE"
```
