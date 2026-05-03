---
name: brownfield-auth-fallback
paths: ["**/auth/**/*.{ts,tsx}", "**/adapters/**/*.{ts,tsx}"]
---
# Brownfield Auth Adapters Need a Fallback Chain

In a brownfield React Native app, authentication tokens come from the native host via a TurboModule bridge. But this bridge has multiple failure modes: the TurboModule isn't registered yet (app startup race), the native host hasn't implemented it (development builds), or you're running in expo-router standalone mode where no host exists at all.

An auth adapter that only tries the TurboModule will crash or hang during development, making it impossible to iterate on the React Native surfaces without the full native host running.

Build a fallback chain: TurboModule → bootstrap/dev token → noop (anonymous). Each level should log which auth source is active so debugging is straightforward. The noop fallback must still satisfy the auth interface contract (return a valid but empty token structure).

## Verify

"Does this auth adapter gracefully degrade if the TurboModule isn't available? Can I develop without the native host?"

## Patterns

Bad — hard dependency on TurboModule:

```typescript
import { NativeAuthModule } from "./turbo/NativeAuthModule";

export async function getAuthToken(): Promise<string> {
 // 💥 Crashes if TurboModule not registered
 return NativeAuthModule.getToken();
}
```

Good — fallback chain with logging:

```typescript
import { NativeAuthModule } from "./turbo/NativeAuthModule";
import { Config } from "../config";

export async function getAuthToken(): Promise<string> {
 // 1. Try TurboModule (production path)
 try {
  if (NativeAuthModule?.getToken) {
   const token = await NativeAuthModule.getToken();
   console.debug("[auth] source: TurboModule");
   return token;
  }
 } catch (e) {
  console.warn("[auth] TurboModule failed:", e);
 }

 // 2. Try bootstrap token (dev/CI path)
 if (Config.BOOTSTRAP_TOKEN) {
  console.debug("[auth] source: bootstrap token");
  return Config.BOOTSTRAP_TOKEN;
 }

 // 3. Noop fallback (anonymous access)
 console.debug("[auth] source: noop (anonymous)");
 return "";
}
```
