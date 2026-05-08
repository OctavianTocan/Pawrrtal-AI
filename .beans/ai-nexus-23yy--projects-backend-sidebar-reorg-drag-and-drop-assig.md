---
# pawrrtal-23yy
title: 'Projects: backend + sidebar reorg + drag-and-drop assignment'
status: completed
type: feature
priority: high
created_at: 2026-05-04T22:31:36Z
updated_at: 2026-05-04T22:49:13Z
---

Add Projects as a top-level grouping in the sidebar. Reference screenshot shows:
- "Projects ▾" header at the top of the sidebar (above Chats)
- Each project: folder icon + name + edit pencil on hover
- Inline "+ project" button in the header (folder-plus icon)
- "Chats" stays as a separate section below (date-grouped + Archived bucket)
- Drag any chat row → drop on a project → conversation joins that project
- Drag a chat off a project → unassigns

## Backend
- New `projects` table (id, user_id, name, created_at, updated_at)
- Add `project_id` (nullable FK → projects) to conversations
- Alembic migration
- POST /api/v1/projects (create)
- GET /api/v1/projects (list mine)
- PATCH /api/v1/projects/{id} (rename)
- DELETE /api/v1/projects/{id} (delete; conversations un-link, not deleted)
- Extend PATCH /api/v1/conversations/{id} to accept project_id (null = move out)

## Frontend
- New types: Project, ProjectId
- features/projects/ feature with: ProjectsList, ProjectRow, NewProjectButton
- Hooks: useGetProjects, useCreateProject, useRenameProject, useDeleteProject, useAssignConversationToProject
- Sidebar nav restructured: NewSession + search (existing) + Projects section + Chats section
- Drag-and-drop via native HTML5 drag-and-drop (no new dep)
- Drop targets: project rows highlight on dragOver; drop fires assign mutation
- Inline rename modal/inline-edit for project names

## Tests
- Backend: pytest for projects CRUD + assignment
- Frontend: hooks + component render tests

## Todo
- [ ] Backend model + migration
- [ ] Backend schemas + CRUD service
- [ ] Backend API endpoints
- [ ] Extend ConversationUpdate for project_id
- [ ] Frontend types + API_ENDPOINTS
- [ ] Frontend project query hooks (list/create/rename/delete/assign)
- [ ] Frontend ProjectsList + ProjectRow components
- [ ] Drag-and-drop wiring (chat row → project drop target)
- [ ] Sidebar reorganization (Projects above Chats)
- [ ] Tests for new hooks + components
- [ ] biome + tsc + sentrux clean


## Done
- Backend: Project model + alembic 005, ProjectCreate/Update/Response schemas, projects CRUD service, /api/v1/projects router (GET/POST/PATCH/DELETE), conversations.project_id FK, ConversationUpdate.project_id + project_id_set sentinel for explicit clears
- Frontend: Project type + project_id on Conversation, API_ENDPOINTS.projects, useGetProjects/useCreateProject/useRenameProject/useDeleteProject/useAssignConversationToProject hooks, features/projects/components (ProjectsList + ProjectRow + RenameProjectModal), CONVERSATION_DRAG_MIME constant
- Drag-and-drop: EntityRow now accepts draggable + onDragStart props; ConversationSidebarItemView wires the conversation ID into dataTransfer; ProjectRow handles dragEnter/Over/Drop with a custom MIME type so non-conversation drops are ignored
- Sidebar: ProjectsList mounted above NavChats in app-layout (both mobile + desktop branches)
- Refactor: split ConversationStatusGlyph + ConversationUnreadGlyph into their own files (per AGENTS.md icon rule, also fixed the 502-line file ceiling)
- Tests: 9 new backend pytest cases for project CRUD + assignment, ProjectRow drag-drop component test, projects constants test
