# Issue tracker: Beans (local markdown)

Issues and tasks for this repo live as markdown files in `.beans/`, managed with the `beans` CLI.

## Conventions

- One bean file per task, named `.beans/ai-nexus-<id>--<slug>.md`
- Frontmatter fields: `title`, `status`, `type`, `priority`, `tags`, `created_at`, `updated_at`
- Valid `status` values: `todo`, `in-progress`, `completed`
- Valid `type` values: `task`, `feature`, `milestone`, `bug`
- `beans create <title>` creates a new bean; `beans update <id> <field> <value>` updates a field

## When a skill says "publish to the issue tracker"

Run `beans create <title>` from the repo root — it creates a `.beans/ai-nexus-<id>--<slug>.md` file with properly formatted frontmatter. The skill will document the newly created bean path.

## When a skill says "fetch the relevant ticket"

Read the `.beans/<id>--<slug>.md` file at the path referenced by the skill. The user normally passes the bean ID or path directly.

## Relationship to Notion

The project previously used Notion for task tracking (visible in historical documentation). The beans system is the current canonical local tracker. Skills should use beans files as the source of truth for implementation tasks.
