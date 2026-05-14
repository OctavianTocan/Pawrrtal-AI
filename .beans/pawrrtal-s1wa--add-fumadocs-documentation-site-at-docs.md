---
# pawrrtal-s1wa
title: Add Fumadocs documentation site at /docs
status: todo
type: feature
priority: normal
created_at: 2026-05-14T09:08:55Z
updated_at: 2026-05-14T11:40:39Z
---

Add a Fumadocs documentation site to the existing frontend Next.js app, serving /docs/handbook (curated public-safe internal docs) and /docs/product (5 seed pages, feature-tour). Stock theme, public surface, single deployment.

Spec: frontend/content/docs/handbook/decisions/2026-05-14-add-fumadocs-documentation-site.md

## Phasing (single PR, 5 commits)

- [x]   1. chore(docs): scaffold fumadocs deps + config
- [x]   2. feat(docs): scaffold /docs routes and providers
- [x]   3. feat(docs): migrate handbook content (git mv + frontmatter + path sweep)
- [x]   4. feat(docs): seed product section (5 pages)
- [x]   5. feat(docs): search route + sitemap

## Gates

- [x] bun run check clean
- [x] bun run build succeeds
- [x] just sentrux clean
- [x] Route smoke (200 on /docs, /docs/handbook, /docs/product, one known slug, /api/search)
- [x] source.test.ts asserts MDX count parity
- [x] dev-console-smoke covers /docs/handbook and /docs/product cold-boot

## Customization pass (added 2026-05-14 after stock Fumadocs landed)

### Tier 1 (config tweaks)

- [ ]   1. Add `githubUrl` to baseOptions
- [ ]   2. Sidebar `defaultOpenLevel: 1` on both layouts
- [ ]   3. Swap `neutral.css` → `vitepress.css`
- [ ]   4. Replace `/docs/page.tsx` Link cards with `<Cards>` MDX primitives

### Tier 2 (chrome + content)

- [ ]   5. Sidebar banner + footer slots (light branding)
- [x]   6. Convert ADR Status/Decision blocks to `<Callout>` where natural
- [ ]   7. Tabs in DocsLayout for Handbook ↔ Product switching
- [x]   8. Code block `title=` annotations on ADRs that quote files

### Tier 3 (brand)

- [ ]   9. Switch product section to Notebook layout
- [ ]   10. Newsreader heading font override (`--fd-font-heading`)
- [ ]   11. Custom `/docs` landing — hero + feature blurbs
