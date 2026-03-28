# Vercel Environment Variables

Use `process.env.VERCEL_ENV` instead of `process.env.NODE_ENV` for deployment
environment checks. `NODE_ENV` is binary (development/production) and set to
"production" on all Vercel deploys (including previews). `VERCEL_ENV` has
three values: "development" (local), "preview" (PR deploys), and "production"
(production deploys). This gives you the granularity to distinguish between
local dev, preview deploys, and production.

## Verify
"Is the code using `VERCEL_ENV` instead of `NODE_ENV` for environment-specific
logic? Is `NODE_ENV === 'development'` only used for truly local-only code?"

## Patterns

Bad -- using NODE_ENV for deployment checks:

```tsx
// This will expose test credentials on preview deploys too, because
// NODE_ENV is "production" on all Vercel environments!
const shouldExposeTestUser = process.env.NODE_ENV === 'development';

if (process.env.NODE_ENV !== 'production') {
  console.log('Debug info'); // Runs on previews!
}
```

Good -- using VERCEL_ENV for deployment checks:

```tsx
// Only exposes test credentials in local development, not on preview deploys
const shouldExposeTestUser = process.env.VERCEL_ENV === 'development';

// Only runs in local dev
if (process.env.VERCEL_ENV === 'development') {
  console.log('Debug info');
}

// Runs in local dev AND preview deploys (but not production)
if (process.env.VERCEL_ENV !== 'production') {
  enableDebugFeatures();
}
```

## When to use each

- **Local dev only**: Use `VERCEL_ENV === 'development'` or `!VERCEL_ENV` (VERCEL_ENV is undefined locally)
- **Preview AND local**: Use `VERCEL_ENV !== 'production'`
- **Production only**: Use `VERCEL_ENV === 'production'`
- **Preview only**: Use `VERCEL_ENV === 'preview'`

## Notes

- `NODE_ENV` is still useful for build-time optimizations (minification, etc.)
- When in doubt, use `VERCEL_ENV` for runtime environment checks
- Remember: `VERCEL_ENV` is undefined in non-Vercel environments (use fallbacks)
