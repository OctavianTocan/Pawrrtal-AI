---
name: Manual Authentication and User-Scoped Chat Implementation
overview: This plan details the manual implementation of `fastapi-users` with `Agno` integration, using standard UUIDs for users and JWT authentication, as confirmed.
todos:
  - id: install_pkgs
    content: "Install dependencies: fastapi-users[sqlalchemy], aiosqlite"
    status: pending
  - id: create_db_py
    content: "Create backend/app/db.py: Database setup and User model"
    status: pending
    dependencies:
      - install_pkgs
  - id: create_users_py
    content: "Create backend/app/users.py: UserManager and Auth Backend config"
    status: pending
    dependencies:
      - create_db_py
  - id: update_main_auth
    content: "Update backend/main.py: Register Auth Routers"
    status: pending
    dependencies:
      - create_users_py
  - id: link_agno_user
    content: "Update backend/main.py: Protect Chat Endpoint & Link Agno to User"
    status: pending
    dependencies:
      - update_main_auth
  - id: add_chat_list
    content: "Update backend/main.py: Add GET /api/chats endpoint"
    status: pending
    dependencies:
      - link_agno_user
---
