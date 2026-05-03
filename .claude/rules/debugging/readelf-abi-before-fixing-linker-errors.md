---
name: readelf-abi-before-fixing-linker-errors
paths: ["**/*"]
---

# Use readelf to Verify Actual .so ABI Before Attempting Linker Fix Workarounds

When a native `.so` in a brownfield AAR is reported as "built against a different version" of a shared library, verify with symbol comparison before attempting a fix. Same source version usually means same ABI.

## Rule

Dynamic linking resolves by symbol name, not binary offset. A `.so` compiled locally against RN 0.83.6 source and a `.so` from Maven Central's `react-android:0.83.6` export the same symbols. The linker doesn't care which compiler produced them.

## Verify

When a `.so` reports "built against a different version": have you compared the actual symbols to confirm a real mismatch exists?

## Patterns

### Pattern (bad)

```bash
# Assuming version mismatch means ABI incompatibility
# Linking fails → must rebuild the .so against correct version
# But symbols actually match — wasted time on unnecessary rebuild
```

### Pattern (good)

```bash
# Get undefined symbols from the suspect .so
nm -D --undefined-only suspect.so | awk '{print $2}' | sort > needed.txt

# Get exported symbols from the provider .so (Maven Central, etc.)
nm -D --defined-only provider.so | awk '{print $3}' | sort > available.txt

# Find truly missing symbols (ignore @LIBC system symbols)
comm -23 needed.txt available.txt | grep -v '@LIBC'
# Empty output = ABI compatible, no fix needed
```

## Why

Spent time investigating a reported `libreact_codegen_rnscreens.so` vs `libreactnative.so` mismatch. A 5-minute symbol comparison proved all 186 symbols resolved correctly across `libreactnative.so`, `libjsi.so`, `libfbjni.so`, and `libc++_shared.so`. The "mismatch" was a false alarm.
