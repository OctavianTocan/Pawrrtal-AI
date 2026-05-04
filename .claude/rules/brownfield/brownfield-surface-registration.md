---
name: brownfield-surface-registration
paths: ["**/entry.{ts,tsx}", "**/index.{ts,tsx}", "**/App.{ts,tsx}"]
---
# Register Brownfield Surfaces via AppRegistry, Not expo-router

In a brownfield React Native setup, the native host app mounts React Native surfaces by **module name** using `AppRegistry.registerComponent('ModuleName', () => Component)`. The host app's iOS/Android code calls `RCTRootView` or `ReactRootView` with that exact string.

expo-router manages its own navigation stack and expects to control the entire app lifecycle. It uses URL-based routing, which means it cannot be mounted by module name from a native host. If you register surfaces via expo-router file conventions, the native host will fail to find them with `Invariant Violation: "ModuleName" has not been registered`.

Keep brownfield surface registration in a dedicated `entry.tsx` that calls `AppRegistry.registerComponent()` for each surface. expo-router's `_layout.tsx` should be reserved for standalone development mode only.

## Verify

"Is this React Native surface mounted by a native host app? If so, is it registered via AppRegistry.registerComponent()?"

## Patterns

Bad — registering via expo-router (native host can't find it):

```typescript
// app/checkout/index.tsx (expo-router convention)
export default function CheckoutScreen() {
 return <CheckoutFlow />;
}
// Native host: RCTRootView(moduleName: "CheckoutSurface")
// ❌ Invariant Violation: "CheckoutSurface" has not been registered
```

Good — explicit AppRegistry registration in entry.tsx:

```typescript
// entry.tsx
import { AppRegistry } from "react-native";
import { CheckoutSurface } from "./surfaces/CheckoutSurface";
import { ProfileSurface } from "./surfaces/ProfileSurface";

AppRegistry.registerComponent("CheckoutSurface", () => CheckoutSurface);
AppRegistry.registerComponent("ProfileSurface", () => ProfileSurface);
```

Good — keep both entry points for dev and production:

```typescript
// package.json
{
 "main": "./entry.tsx",            // brownfield: AppRegistry surfaces
 "expo": { "entryPoint": "./app" } // standalone dev: expo-router
}
```
