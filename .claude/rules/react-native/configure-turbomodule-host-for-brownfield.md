---
name: configure-turbomodule-host-for-brownfield
paths: ["**/*.{ts,tsx,kt,java,swift}"]
---

# TurboModules Need Explicit Host App Configuration in Brownfield - Set Up the Delegate

TurboModules in brownfield React Native apps need explicit host configuration. The native host app must register the TurboModule provider, and the JS side must use `TurboModuleRegistry.getEnforcing()`.

## Rule

Brownfield TurboModules handle bidirectional communication between the React Native surfaces and the native host. Standard modules:

- **Auth TurboModule** — passes authentication tokens from native to JS
- **Config TurboModule** — passes feature flags and environment config
- **Navigation TurboModule** — handles deep links and surface transitions

Each must be registered in the native host's TurboModule provider and consumed in JS via the registry, not via NativeModules (the legacy bridge).

## Why

NativeModules (bridge) are deprecated in the New Architecture. TurboModules use JSI for synchronous, type-safe native calls. In brownfield apps, these modules are the only way to communicate with the host app since there's no shared JavaScript runtime.

## Verify

"Are TurboModules registered in the native host's TurboModule provider? Is the JS side using `TurboModuleRegistry.getEnforcing()` instead of `NativeModules`?"

## Patterns

Bad — using legacy NativeModules bridge:

```typescript
import { NativeModules } from 'react-native';
const { AuthModule } = NativeModules; // deprecated, async-only
```

Good — using TurboModuleRegistry:

```typescript
// TypeScript spec
import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

export interface Spec extends TurboModule {
  getAuthToken(): string;
  refreshToken(): Promise<string>;
}

export default TurboModuleRegistry.getEnforcing<Spec>('AuthModule');
```
