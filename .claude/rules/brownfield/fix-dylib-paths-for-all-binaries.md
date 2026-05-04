---
name: fix-dylib-paths-for-all-binaries
paths: ["**/*.{ts,tsx,kt,swift,gradle,xml}", "**/Podfile", "**/*.xcconfig"]
---

# Run install_name_tool on Every Binary in xcframework, Not Just the First

The brownfield CLI sometimes leaks absolute paths or temp build paths as framework install names. Fixing only the framework `-id` leaves the main binary and debug dylib still referencing the old absolute path. dyld can't find the framework at runtime and crashes with "Library not loaded."

After fixing framework install names with `install_name_tool -id`, also patch cross-references in the main app binary AND `.debug.dylib` files — not just framework-to-framework references.

## Verify

"Did I run install_name_tool -change on the main binary and debug dylibs too, or only on framework-to-framework references?"

## Patterns

Bad — only fixes the framework's own install name, incomplete:

```bash
# Only fixes the framework's own install name — incomplete
install_name_tool -id "@rpath/MyFramework.framework/MyFramework" \
  "$APP/Frameworks/MyFramework.framework/MyFramework"
```

Good — fix framework ID, cross-references, AND main binary + debug dylibs:

```bash
# Fix framework ID, cross-references, AND main binary + debug dylibs
install_name_tool -id "@rpath/$FWNAME.framework/$FWNAME" "$BINARY"
# Fix references in other frameworks
for OTHER in $FW_NAMES; do
  install_name_tool -change "$CURRENT" "$EXPECTED" "$FW_DIR/$OTHER.framework/$OTHER"
done
# CRITICAL: Fix references in main binary and debug dylibs
for bin in "$APP/TwinMindTestHost" "$APP/"*.dylib; do
  install_name_tool -change "$CURRENT" "$EXPECTED" "$bin"
done
```

This caused 9 failed CI runs where the crash log pointed at `TwinMindTestHost.debug.dylib`, not the framework itself.
