---
name: no-unwrap-in-production
paths: ["**/*.rs"]
---

# No unwrap() in Production Rust

Never use `unwrap()` in production code. Use `Result<T, E>` with the `?` operator for proper error propagation. If a value is genuinely guaranteed to exist, use `expect("reason")` with an explanation. But even `expect` is a code smell — prefer `?` and let the caller decide.

**Why:** `unwrap()` panics at runtime with no context. In a long-running Telegram bot or agent gateway, a panic takes down the entire process and loses all in-flight conversations.

**Learned from:** tap (OctavianTocan/tap) — Rust multi-agent gateway.

## Verify

"Does this code contain `.unwrap()` outside of tests? Should this fallible operation use `?` instead?"

## Patterns

Bad — unwrap panics the entire process:

```rust
fn handle_message(msg: &str) -> Response {
    let parsed: Command = serde_json::from_str(msg).unwrap(); // panics on bad JSON
    let config = CONFIG.lock().unwrap(); // panics if mutex is poisoned
    dispatch(parsed, &config)
}
```

Good — propagate errors with `?`, let caller decide:

```rust
fn handle_message(msg: &str) -> Result<Response, AppError> {
    let parsed: Command = serde_json::from_str(msg)?; // propagates parse error
    let config = CONFIG.lock().map_err(|e| AppError::LockPoisoned(e.to_string()))?;
    Ok(dispatch(parsed, &config))
}
```
