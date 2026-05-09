---
# pawrrtal-8kxs
title: Adopt agentic-stack workspace template
status: todo
type: feature
priority: normal
created_at: 2026-05-07T16:17:52Z
updated_at: 2026-05-07T16:17:52Z
---

## Goal

Replace the current ad-hoc ``AGENTS.md`` / ``IDENTITY.md`` / ``SOUL.md`` / ``TOOLS.md`` / ``USER.md`` seed files written by ``backend/app/core/workspace.py`` with the structure and conventions from https://github.com/codejunkie99/agentic-stack.

## Why

User direction: "For the workspace template that we are using, I need us to follow this." Aligning with an external published template gives us a known-good structure, downloadable updates, and shared vocabulary with anyone using the same stack.

## Approach

1. Read the ``agentic-stack`` repo end-to-end. List every file/dir it specifies as part of a workspace, the conventions it assumes, and any expected agent-side behaviour.
2. Map each file in the current ``workspace.py`` seeders to the agentic-stack equivalent. Items that don't map cleanly: keep as legacy with a deprecation note, or scrap.
3. Update ``_AGENTS_MD``, ``_IDENTITY_MD``, ``_TOOLS_MD``, ``_build_soul_md``, ``_build_user_md`` to produce the agentic-stack shapes. New files (e.g. ``LESSONS.md`` if used) get their own builders.
4. Update ``test_workspace.py`` assertions to match the new structure.
5. Decide migration strategy for already-seeded workspaces in production: leave alone (legacy), or run a one-shot rewrite.

## Open questions

- Does agentic-stack assume a specific runtime (claude-code, cursor, generic)? We need to ensure compatibility with both Gemini and Claude codepaths.
- Are there per-skill subdirs (e.g. ``skills/<name>/SKILL.md``) we should pre-seed? Currently we only ``.gitkeep`` ``skills/``.

## Todos

- [ ] Pull agentic-stack repo, read it
- [ ] Document mapping between current seeders and agentic-stack files
- [ ] Update ``backend/app/core/workspace.py`` seeders
- [ ] Update tests
- [ ] Decide on existing-workspace migration; document
- [ ] Update ``backend/app/core/agent_loop`` system prompt if it references the old structure

## Related

- Depends on pawrrtal-dmor (workspace must actually be wired into providers first, otherwise this is paint on a wall)
