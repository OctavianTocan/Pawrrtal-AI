---
name: never-override-auth-library-internals
paths: ["**/*.{ts,tsx}"]
---
# Never Override Auth Library Internals (e.g. Firebase Nonce Handling) - It Causes auth/internal-error

When using auth libraries like Firebase, don't set custom parameters that
conflict with the library's internal handling. Firebase manages nonces
internally for `signInWithPopup`. Setting `setCustomParameters({ nonce })`
causes `auth/internal-error`. Three security PRs were reverted in one day
from this exact mistake.

## Verify

"Am I overriding something the auth library already handles internally?
Did I check what the library manages automatically?"

## Patterns

Bad — conflicts with Firebase's internal nonce:

```typescript
const provider = new OAuthProvider('apple.com');
provider.setCustomParameters({ nonce: hashedNonce });
await signInWithPopup(auth, provider); // auth/internal-error
```

Good — let Firebase handle nonces for popup flows:

```typescript
const provider = new OAuthProvider('apple.com');
provider.addScope('email');
provider.addScope('name');
await signInWithPopup(auth, provider); // Firebase manages nonce internally
```
