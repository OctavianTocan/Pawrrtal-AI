---
# pawrrtal-u6rm
title: Add React Doctor CI gate
status: completed
type: task
priority: normal
created_at: 2026-05-12T15:49:22Z
updated_at: 2026-05-12T15:52:39Z
---

Add a GitHub Actions CI gate for React Doctor using the marketplace action, following the repo actor-gate and self-hosted runner rules.

- [x] Verify the action usage and version
- [x] Add the workflow or job with required CI safety rules
- [x] Validate workflow syntax and update tracking

## Summary of Changes

- Added `.github/workflows/react-doctor.yml` for pull requests and pushes to `development` / `main`.
- Pinned `millionco/react-doctor` to the commit behind `react-doctor@0.0.38` and pinned `actions/checkout` to the commit behind `v6.0.2`.
- Configured the job with the repository actor/fork gate, self-hosted runner labels, recursive submodule checkout, full three-project scan, `fail-on: warning`, offline scoring, and PR comments via `GITHUB_TOKEN`.

## Verification

- Marketplace page checked: `react-doctor@0.0.38` is the current Marketplace version and documents the action inputs used here.
- `git ls-remote --tags https://github.com/millionco/react-doctor.git refs/tags/react-doctor@0.0.38` resolved `1d3d514a562bbab42dcefa0badeed2e707ed7ea9`.
- `git ls-remote --tags https://github.com/actions/checkout.git refs/tags/v6.0.2` resolved `de0fac2e4500dabe0009e67214ff5f5447ce83dd`.
- `ruby -e 'require "yaml"; YAML.load_file(".github/workflows/react-doctor.yml"); puts "ok"'` passed.
- `git diff --check` passed.
