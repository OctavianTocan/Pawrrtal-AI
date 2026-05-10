---
name: mock-react-native-in-vitest
paths: [".no-match"]
---

# Mock React Native in Vitest

Any test file that imports (directly or transitively) from `react-native` must mock the module. Vitest uses esbuild which cannot parse React Native's Flow type annotations.

## Rule

Create a shared mock setup or add per-file mocks:

```typescript
vi.mock('react-native', () => ({
  Platform: { OS: 'ios', select: vi.fn((obj: Record<string, unknown>) => obj.ios) },
  StyleSheet: { create: (s: Record<string, unknown>) => s },
  View: 'View',
  Text: 'Text',
  ScrollView: 'ScrollView',
  TouchableOpacity: 'TouchableOpacity',
  Dimensions: { get: vi.fn(() => ({ width: 375, height: 812 })) },
}));
```

## Verify

"Does this test file import react-native directly or transitively? Does vitest fail with a Flow parsing error? Have I added the mock before the import?"

## Patterns

Per-file mock:

```typescript
vi.mock('react-native', () => ({
  Platform: { OS: 'ios', select: vi.fn((obj: Record<string, unknown>) => obj.ios) },
  StyleSheet: { create: (s: Record<string, unknown>) => s },
  View: 'View',
  Text: 'Text',
  ScrollView: 'ScrollView',
  TouchableOpacity: 'TouchableOpacity',
  Dimensions: { get: vi.fn(() => ({ width: 375, height: 812 })) },
}));
```

Shared setup file:

```typescript
// test/setup.ts
import { beforeAll } from 'vitest';
beforeAll(() => {
  vi.mock('react-native', () => ({
    Platform: { OS: 'ios', select: vi.fn((obj: Record<string, unknown>) => obj.ios) },
    StyleSheet: { create: (s: Record<string, unknown>) => s },
    View: 'View',
    Text: 'Text',
    ScrollView: 'ScrollView',
    TouchableOpacity: 'TouchableOpacity',
    Dimensions: { get: vi.fn(() => ({ width: 375, height: 812 })) },
  }));
});
```

## Why

The error manifests as `SyntaxError: Unexpected token` pointing at Flow type annotations (`type Props = {|...|}`) inside `node_modules/react-native/`. esbuild genuinely cannot parse Flow. Mocking is the only solution.
