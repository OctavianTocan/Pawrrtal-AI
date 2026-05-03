---
name: expo-brownfield-dual-entry
paths: ["**/entry.{ts,tsx}", "**/app/_layout.{ts,tsx}", "package.json"]
---
# Keep Dual Entry Points for Expo Brownfield Projects

An Expo project can serve two roles simultaneously: a standalone development app (via expo-router) and a brownfield module (via AppRegistry). These require different entry points, and both should be maintained.

`_layout.tsx` and the `app/` directory power expo-router for standalone development — you get navigation, deep linking, and the full development experience with `expo start`. `entry.tsx` registers individual surfaces via `AppRegistry.registerComponent()` for the native host app to mount in production.

If you only maintain the brownfield entry point, you lose expo-router's development experience. If you only maintain the expo-router entry, the native host can't find your surfaces. Keep both, and configure `package.json` to select the right one per context.

## Verify

"Does this project need to run both as a standalone dev app and as embedded brownfield surfaces? Are both entry points maintained?"

## Patterns

Bad — only brownfield entry, no dev experience:

```json
{
 "main": "./entry.tsx"
}
```

```typescript
// entry.tsx — only way to run the app
import { AppRegistry } from "react-native";
import { CheckoutSurface } from "./surfaces/Checkout";
AppRegistry.registerComponent("Checkout", () => CheckoutSurface);
// Can't use expo-router, no navigation in dev
```

Good — dual entry points:

```json
{
 "main": "./index.ts"
}
```

```typescript
// index.ts — entry router
import { Platform } from "react-native";

if (process.env.EXPO_PUBLIC_MODE === "brownfield") {
 require("./entry");    // AppRegistry surfaces for native host
} else {
 require("expo-router/entry"); // expo-router for standalone dev
}
```

```typescript
// entry.tsx — brownfield surfaces
import { AppRegistry } from "react-native";
import { CheckoutSurface } from "./surfaces/Checkout";
import { ProfileSurface } from "./surfaces/Profile";

AppRegistry.registerComponent("Checkout", () => CheckoutSurface);
AppRegistry.registerComponent("Profile", () => ProfileSurface);
```

```typescript
// app/_layout.tsx — expo-router for development
import { Stack } from "expo-router";

export default function Layout() {
 return (
  <Stack>
   <Stack.Screen name="checkout" />
   <Stack.Screen name="profile" />
  </Stack>
 );
}
```
