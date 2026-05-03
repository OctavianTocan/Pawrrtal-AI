---
name: cargo-check-before-commit
paths: ["**/*.rs"]
---

# Run cargo test, clippy, and fmt --check Before Every Commit

Run `cargo test && cargo clippy && cargo fmt --check` before every commit. All three must pass. Fix clippy warnings, not just errors.

**Why:** Rust compiler errors are cheap locally and expensive in CI. Clippy catches idiomatic mistakes. Format consistency prevents noisy diffs.

**Learned from:** tap (OctavianTocan/tap) — CI pipeline convention.

## Verify

"Did I run `cargo test && cargo clippy && cargo fmt --check` before committing? Are there any clippy warnings I skipped?"

## Patterns

Bad — committing without checking:

```bash
# wrote code, committed immediately
git add -A && git commit -m "fix handler"
# CI fails on clippy warning or formatting → round-trip delay
```

Good — always run the trilogy before commit:

```bash
cargo test && cargo clippy && cargo fmt --check
# all green → safe to commit
git add -A && git commit -m "fix handler"
```
