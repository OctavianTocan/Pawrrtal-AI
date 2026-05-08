---
# pawrrtal-pq4r
title: 'Bug: duplicate default Workspace rows on personalization save'
status: in-review
type: bug
priority: high
created_at: 2026-05-07T16:17:18Z
updated_at: 2026-05-07T18:10:00Z
pr: https://github.com/OctavianTocan/pawrrtal/pull/111
---

## Symptom

After completing onboarding **once** with a single user, two ``Workspace`` rows exist in DB with ``is_default=True`` for the same ``user_id``, and two corresponding directories under ``workspaces/`` (or ``backend/workspaces/``).

Confirmed by direct DB query against the local sqlite:

```
id=bdf50320-...  user=f4b922dc-...  name='Main' slug='main' is_default=True path=workspaces/bdf50320-...
id=58b57c42-...  user=f4b922dc-...  name='Main' slug='main' is_default=True path=workspaces/58b57c42-...
```

## Root cause (suspected)

``backend/app/api/personalization.py`` (PUT ``/api/v1/personalization``) calls ``ensure_default_workspace`` after upserting the personalization row, **before** committing. ``ensure_default_workspace`` does ``get_default_workspace`` + create-if-missing, no commit barrier in the lookup.

If the request fires twice in quick succession (React StrictMode dev double-effect, double-click on the onboarding submit, retried fetch), both requests run ``get_default_workspace`` before either has committed. Both see no default → both call ``create_workspace`` → both ``session.commit()`` → two rows persist.

There is no ``UNIQUE (user_id, is_default) WHERE is_default = true`` constraint to make the second insert fail.

## Fix proposal

Two layers:

1. **DB constraint** — add a partial unique index on ``(user_id) WHERE is_default IS TRUE`` via Alembic migration so the second insert errors out cleanly.
2. **Idempotency** — wrap the create branch in ``ensure_default_workspace`` with row-level locking (``SELECT ... FOR UPDATE`` on user) or upsert semantics. Sqlite local won't enforce ``FOR UPDATE`` but Postgres will. Alternatively, catch ``IntegrityError`` from the constraint and re-fetch.

## Verify after fix

- Manually fire two simultaneous PUT ``/api/v1/personalization`` requests; only one ``Workspace`` row lands.
- React StrictMode double-mount during onboarding doesn't create a second workspace.
- Existing duplicates need a one-shot cleanup script (pick the most recent row, scrub the duplicates, drop their directories).

## Todos

- [ ] Add Alembic migration: partial unique index on ``workspace.user_id`` where ``is_default IS TRUE``
- [ ] Update ``ensure_default_workspace`` to handle integrity error → re-fetch
- [ ] Add a backend test that hits ``upsert_personalization`` twice concurrently and asserts a single row
- [ ] Write a cleanup script (one-shot) to dedupe existing rows in any deployed DB
- [ ] Verify ``backend/workspaces`` orphan directories are also cleaned up
