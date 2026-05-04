---
name: vitest-mock-flow-types
paths: ["**/package.json", "pnpm-workspace.yaml", "pnpm-lock.yaml"]
---

# Mock Flow-Typed React Native Packages in Vitest

Vitest cannot parse Flow type annotations. Mock `react-native` AND any third-party React Native package that ships Flow source in every test file that imports from them, directly or transitively.

## Rule

```typescript
// Always mock react-native itself
vi.mock('react-native', () => ({
  Platform: { OS: 'ios', select: vi.fn((obj: Record<string, unknown>) => obj.ios) },
  StyleSheet: { create: (s: Record<string, unknown>) => s },
  View: 'View',
  Text: 'Text',
}));

// Mock any third-party RN package that ships Flow source
vi.mock('@react-native-community/datetimepicker', () => ({
  default: (): null => null,
}));
```

Place these at the top of the test file, before imports. Use `vi.hoisted()` if the mock needs variables defined before the `vi.mock` factory runs.

## Known Flow-typed packages

These ship Flow source and will crash Vitest without mocks:

- `react-native` (core)
- `@react-native-community/datetimepicker`
- `react-native-svg` (some versions)
- `react-native-gesture-handler`
- `react-native-reanimated`
- `@react-native-async-storage/async-storage`

## Transitive imports matter

If your test imports `ComponentA` which imports `ComponentB` which imports `@react-native-community/datetimepicker`, your test needs the mock. The error message points at a file inside `node_modules/` with `@flow` at the top — that's your signal.

## Why

React Native and many community packages ship as Flow-typed source. Vitest uses esbuild (or rolldown) which can't parse Flow syntax. The error looks like `Parse failed: Flow is not supported` or `Unexpected token` pointing at a Flow type annotation.

## Verify

"Does the test import anything from `react-native` or a Flow-typed community package, even transitively? Are all such packages mocked with `vi.mock()` at the top of the test file?"

## Patterns

Bad — importing Flow-typed packages without mocking:

```typescript
// test runs, then crashes with "Flow is not supported"
import { DateTimePicker } from '@react-native-community/datetimepicker';
```

Good — mock every Flow-typed package before imports:

```typescript
vi.mock('react-native', () => ({
  Platform: { OS: 'ios', select: vi.fn((obj) => obj.ios) },
  StyleSheet: { create: (s) => s },
  View: 'View',
  Text: 'Text',
}));

vi.mock('@react-native-community/datetimepicker', () => ({
  default: (): null => null,
}));

// Now safe to import components that depend on these packages
import { MyComponent } from './MyComponent';
```
