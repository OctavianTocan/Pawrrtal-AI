---
name: security-changes-e2e
paths: ["**/*.{ts,tsx,kt,swift}"]
---

# Security Changes Need E2E Testing

Security header/CSP changes require E2E testing across all auth flows. Never merge multiple security changes in a single PR.

## Rule

Content Security Policy, CORS, and security header changes affect the entire application. Test every authentication flow (email, OAuth, native login, token refresh) before merging. Stack security changes as individual PRs so each can be reverted independently.

## Why

A CSP change that blocks inline scripts can break OAuth popups. A CORS change can silently kill native app login. These failures are invisible in unit tests and only surface in full E2E flows. Multiple security changes in one PR make it impossible to identify which change caused the regression.

## Verify

- Run E2E tests for all auth flows (email, OAuth, native login, token refresh) after any security header/CSP change
- Test on multiple platforms: web, iOS, Android
- Verify OAuth popup opens and closes correctly
- Verify token refresh works in background while requests are in flight

## Patterns

- **One security change per PR:** Each CSP/CORS/header change gets its own PR for independent revert capability
- **Stack security PRs:** Merge security changes sequentially, not concurrently
- **E2E coverage required:** Security changes cannot be merged without E2E test coverage
