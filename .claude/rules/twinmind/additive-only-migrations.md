---
name: additive-only-migrations
paths: ["**/*.{ts,tsx,kt,swift}"]
---

# Additive-Only Migrations

Database migrations must be additive. Never bump the schema version for a feature that might be reverted. Disable Android Auto Backup for database files.

## Rule

Add columns/tables without changing the version number during feature development. Only bump the migration version when the schema change is permanent. Destructive migrations (column renames, drops) on mobile are unrecoverable without data loss.

## Bad

```typescript
// Version bump for an experimental feature
const SCHEMA_VERSION = 5; // was 4
// If the feature is reverted, users on v5 can't downgrade
```

## Good

```typescript
// Add column without version bump during development
db.exec('ALTER TABLE meetings ADD COLUMN IF NOT EXISTS draft_notes TEXT');
// Only bump version after feature ships and stabilizes
```

## Why

Mobile apps can't force-update all users simultaneously. A destructive migration in a reverted feature leaves users with a corrupted database and no rollback path. Auto Backup on Android can restore stale schema versions, causing migration crashes on reinstall.

## Verify

- Run migration from schema N to N+1 and back: confirm no data loss
- Install app, upgrade schema, downgrade (revert feature), reinstall from Auto Backup: confirm no crash
- Verify `ALTER TABLE ADD COLUMN IF NOT EXISTS` is idempotent: safe to run multiple times
- Check that `SCHEMA_VERSION` only increments after feature is confirmed permanent

## Patterns

- **Add-only during development:** Use `ALTER TABLE ADD COLUMN IF NOT EXISTS` without bumping version while feature is experimental
- **Bump version only on stabilize:** Increment `SCHEMA_VERSION` once the feature is merged and won't be reverted
- **Disable Auto Backup for database files:** Use `android:fullBackupContent="false"` or explicit exclude rules for SQLite files
- **Use nullable columns:** New columns should be nullable initially to avoid migration failures on existing rows
