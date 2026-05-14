---
# pawrrtal-s1wa
title: Add Fumadocs documentation site at /docs
status: todo
type: feature
priority: normal
created_at: 2026-05-14T09:08:55Z
updated_at: 2026-05-14T09:21:55Z
---

Add a Fumadocs documentation site to the existing frontend Next.js app, serving /docs/handbook (curated public-safe internal docs) and /docs/product (5 seed pages, feature-tour). Stock theme, public surface, single deployment.

Spec: docs/decisions/2026-05-14-add-fumadocs-documentation-site.md

## Phasing (single PR, 5 commits)
- [x] 1. chore(docs): scaffold fumadocs deps + config
- [ ] 2. feat(docs): scaffold /docs routes and providers
- [ ] 3. feat(docs): migrate handbook content (git mv + frontmatter + path sweep)
- [ ] 4. feat(docs): seed product section (5 pages)
- [ ] 5. feat(docs): search route + sitemap

## Gates
- [ ] bun run check clean
- [ ] bun run build succeeds
- [ ] just sentrux clean
- [ ] Route smoke (200 on /docs, /docs/handbook, /docs/product, one known slug, /api/search)
- [ ] source.test.ts asserts MDX count parity
- [ ] dev-console-smoke covers /docs/handbook and /docs/product cold-boot
