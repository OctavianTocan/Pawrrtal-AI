# Agent Rules

## Releasing

Releases are manual, single-PR affairs. The maintainer controls the changelog voice and format.

To prepare a release:

1. Create a branch (e.g. `prepare-v1.2.0`)
2. Bump the version in `packages/zero-native/package.json`
3. Run `npm --prefix packages/zero-native run version:sync` to update all version references
4. Write the changelog entry in `CHANGELOG.md`, wrapped in `<!-- release:start -->` and `<!-- release:end -->` markers
5. Remove the `<!-- release:start -->` and `<!-- release:end -->` markers from the previous release entry; only the latest release should have markers
6. Open a PR and merge to `main`

CI compares the version in `packages/zero-native/package.json` to what's on npm. If it differs, it publishes the CLI package and creates the GitHub release automatically. If npm already has the version but the GitHub release is missing, CI creates the GitHub release from the marked changelog entry.
