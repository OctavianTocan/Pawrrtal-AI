---
name: test-through-real-subprocess-boundaries
paths: ["**/*.rs"]
---

# Never Mock Subprocess I/O — Spawn Real Fake Binaries in Tests

Never mock I/O boundaries (stdout, stdin, subprocess calls). Instead, build a fake binary (e.g., `fake_claude`) that produces realistic, fixture-driven output and spawn it as a real subprocess in tests.

**Why:** Mocking subprocess I/O hides real-world timing issues, partial reads, and pipe buffering. A fake binary exercises the actual process spawning, signal handling, and stream reading code paths.

**Learned from:** tap (OctavianTocan/tap) — 14 JSONL fixture files driving integration tests through a real `fake_claude` binary.

## Verify

"Am I mocking subprocess stdout/stdin instead of spawning a real process? Will this test catch partial reads, pipe buffering, or signal handling bugs?"

## Patterns

Bad — mocked subprocess hides real-world issues:

```rust
#[test]
fn parses_output() {
    let mock = MockProcess::new();
    mock.set_stdout(r#"{"type":"message","text":"hello"}"#);
    let result = read_response(&mock); // never exercises real pipe I/O
    assert_eq!(result.text, "hello");
}
```

Good — real fake binary via subprocess:

```rust
#[test]
fn parses_output() {
    let fixture = include_str!("../fixtures/hello.jsonl");
    let mut child = Command::new("./fixtures/fake_claude")
        .arg("--fixture=hello")
        .stdout(Stdio::piped())
        .spawn()
        .expect("spawn fake binary");

    let result = read_response(child.stdout.take().unwrap());
    // exercises real process spawning, real pipe buffering, real partial reads
    assert_eq!(result.text, "hello");
}
```
