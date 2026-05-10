"""Tests for the workspace service and API.

Covers:
- seed_workspace: directory structure and file contents
- ensure_default_workspace: idempotency and DB row creation
- GET /api/v1/workspaces: list workspaces
- GET /api/v1/workspaces/{id}/tree: file tree
- GET /api/v1/workspaces/{id}/files/{path}: read file
- PUT /api/v1/workspaces/{id}/files/{path}: write file
- DELETE /api/v1/workspaces/{id}/files/{path}: delete file
- Path traversal guard
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from unittest.mock import patch

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.workspace import (
    _build_soul_md,
    _build_user_md,
    seed_workspace,
)
from app.crud.workspace import (
    create_workspace,
    ensure_default_workspace,
    get_default_workspace,
    list_workspaces,
)
from app.db import User
from app.models import UserPersonalization


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _make_personalization(**kwargs: Any) -> UserPersonalization:
    """Build an unpersisted UserPersonalization for the workspace seeders.

    The seeders only read attributes — they never call session methods —
    so we can instantiate the ORM model directly without a session and
    feed it to ``seed_workspace`` / ``_build_*_md`` with full type
    fidelity.
    """
    defaults: dict[str, Any] = dict(
        user_id=uuid.uuid4(),
        name="Tavi",
        role="Engineer",
        company_website="https://example.com",
        linkedin="https://linkedin.com/in/tavi",
        goals=["Build great products", "Automate toil"],
        personality="direct",
        custom_instructions=None,
        chatgpt_context=None,
        connected_channels=None,
        updated_at=datetime.now(timezone.utc),
    )
    return UserPersonalization(**{**defaults, **kwargs})


# ---------------------------------------------------------------------------
# seed_workspace
# ---------------------------------------------------------------------------


class TestSeedWorkspace:
    def test_creates_standard_subdirectories(self, tmp_path: Path) -> None:
        ws_id = uuid.uuid4()
        with patch("app.core.workspace.settings") as mock_settings:
            mock_settings.workspace_base_dir = str(tmp_path)
            root = seed_workspace(ws_id)

        assert (root / "memory").is_dir()
        assert (root / "skills").is_dir()
        assert (root / "artifacts").is_dir()

    def test_creates_gitkeep_in_each_subdir(self, tmp_path: Path) -> None:
        ws_id = uuid.uuid4()
        with patch("app.core.workspace.settings") as mock_settings:
            mock_settings.workspace_base_dir = str(tmp_path)
            root = seed_workspace(ws_id)

        for subdir in ("memory", "skills", "artifacts"):
            assert (root / subdir / ".gitkeep").exists()

    def test_writes_agents_md(self, tmp_path: Path) -> None:
        ws_id = uuid.uuid4()
        with patch("app.core.workspace.settings") as mock_settings:
            mock_settings.workspace_base_dir = str(tmp_path)
            root = seed_workspace(ws_id)

        agents = (root / "AGENTS.md").read_text()
        assert "AGENTS.md" in agents
        assert "Session Startup" in agents

    def test_writes_identity_and_tools_md(self, tmp_path: Path) -> None:
        ws_id = uuid.uuid4()
        with patch("app.core.workspace.settings") as mock_settings:
            mock_settings.workspace_base_dir = str(tmp_path)
            root = seed_workspace(ws_id)

        assert (root / "IDENTITY.md").exists()
        assert (root / "TOOLS.md").exists()

    def test_does_not_overwrite_existing_files(self, tmp_path: Path) -> None:
        ws_id = uuid.uuid4()
        with patch("app.core.workspace.settings") as mock_settings:
            mock_settings.workspace_base_dir = str(tmp_path)
            root = seed_workspace(ws_id)

        # Manually write custom content.
        custom = "# My custom AGENTS.md\n"
        (root / "AGENTS.md").write_text(custom)

        # Re-seed — existing file must survive.
        with patch("app.core.workspace.settings") as mock_settings:
            mock_settings.workspace_base_dir = str(tmp_path)
            seed_workspace(ws_id)

        assert (root / "AGENTS.md").read_text() == custom

    def test_populates_user_md_from_personalization(self, tmp_path: Path) -> None:
        ws_id = uuid.uuid4()
        p = _make_personalization(name="Alice", role="PM")
        with patch("app.core.workspace.settings") as mock_settings:
            mock_settings.workspace_base_dir = str(tmp_path)
            root = seed_workspace(ws_id, personalization=p)

        user_md = (root / "USER.md").read_text()
        assert "Alice" in user_md
        assert "PM" in user_md

    def test_uses_personality_for_soul_md(self, tmp_path: Path) -> None:
        ws_id = uuid.uuid4()
        p = _make_personalization(personality="analytical")
        with patch("app.core.workspace.settings") as mock_settings:
            mock_settings.workspace_base_dir = str(tmp_path)
            root = seed_workspace(ws_id, personalization=p)

        soul = (root / "SOUL.md").read_text()
        assert "analytical" in soul.lower()

    def test_falls_back_to_balanced_soul_for_unknown_personality(
        self, tmp_path: Path
    ) -> None:
        ws_id = uuid.uuid4()
        p = _make_personalization(personality="goblin")
        with patch("app.core.workspace.settings") as mock_settings:
            mock_settings.workspace_base_dir = str(tmp_path)
            root = seed_workspace(ws_id, personalization=p)

        soul = (root / "SOUL.md").read_text()
        # Balanced soul is the fallback.
        assert "SOUL.md" in soul

    def test_seed_without_personalization_writes_placeholder_user_md(
        self, tmp_path: Path
    ) -> None:
        ws_id = uuid.uuid4()
        with patch("app.core.workspace.settings") as mock_settings:
            mock_settings.workspace_base_dir = str(tmp_path)
            root = seed_workspace(ws_id, personalization=None)

        user_md = (root / "USER.md").read_text()
        assert "Fill in" in user_md


# ---------------------------------------------------------------------------
# Template builders
# ---------------------------------------------------------------------------


class TestBuildUserMd:
    def test_includes_name_role_company(self) -> None:
        p = _make_personalization(
            name="Bob", role="CTO", company_website="https://acme.com"
        )
        md = _build_user_md(p)
        assert "Bob" in md
        assert "CTO" in md
        assert "https://acme.com" in md

    def test_includes_goals_list(self) -> None:
        p = _make_personalization(goals=["Ship fast", "Sleep well"])
        md = _build_user_md(p)
        assert "Ship fast" in md
        assert "Sleep well" in md

    def test_includes_custom_instructions(self) -> None:
        p = _make_personalization(custom_instructions="Always use British English.")
        md = _build_user_md(p)
        assert "British English" in md

    def test_none_personalization_returns_placeholder(self) -> None:
        md = _build_user_md(None)
        assert "Fill in" in md


class TestBuildSoulMd:
    @pytest.mark.parametrize(
        "personality", ["analytical", "creative", "direct", "balanced"]
    )
    def test_known_personalities_return_content(self, personality: str) -> None:
        p = _make_personalization(personality=personality)
        md = _build_soul_md(p)
        assert len(md) > 50

    def test_unknown_personality_returns_balanced(self) -> None:
        p = _make_personalization(personality="wizard")
        md = _build_soul_md(p)
        # Balanced soul contains "well-rounded".
        assert "well-rounded" in md

    def test_none_personalization_returns_balanced(self) -> None:
        md = _build_soul_md(None)
        assert "well-rounded" in md


# ---------------------------------------------------------------------------
# DB service functions
# ---------------------------------------------------------------------------


class TestWorkspaceService:
    @pytest.mark.anyio
    async def test_create_workspace_adds_db_row(
        self, db_session: AsyncSession, test_user: User, tmp_path: Path
    ) -> None:
        with patch("app.core.workspace.settings") as mock_settings:
            mock_settings.workspace_base_dir = str(tmp_path)
            ws = await create_workspace(test_user.id, db_session)
            await db_session.commit()

        assert ws.id is not None
        assert ws.user_id == test_user.id
        assert ws.name == "Main"
        assert ws.is_default is True

    @pytest.mark.anyio
    async def test_create_workspace_seeds_filesystem(
        self, db_session: AsyncSession, test_user: User, tmp_path: Path
    ) -> None:
        with patch("app.core.workspace.settings") as mock_settings:
            mock_settings.workspace_base_dir = str(tmp_path)
            ws = await create_workspace(test_user.id, db_session)
            await db_session.commit()

        root = Path(ws.path)
        assert (root / "AGENTS.md").exists()
        assert (root / "memory").is_dir()

    @pytest.mark.anyio
    async def test_get_default_workspace_returns_none_when_absent(
        self, db_session: AsyncSession, test_user: User
    ) -> None:
        result = await get_default_workspace(test_user.id, db_session)
        assert result is None

    @pytest.mark.anyio
    async def test_get_default_workspace_returns_existing(
        self, db_session: AsyncSession, test_user: User, tmp_path: Path
    ) -> None:
        with patch("app.core.workspace.settings") as mock_settings:
            mock_settings.workspace_base_dir = str(tmp_path)
            created = await create_workspace(test_user.id, db_session)
            await db_session.commit()

        fetched = await get_default_workspace(test_user.id, db_session)
        assert fetched is not None
        assert fetched.id == created.id

    @pytest.mark.anyio
    async def test_ensure_default_workspace_is_idempotent(
        self, db_session: AsyncSession, test_user: User, tmp_path: Path
    ) -> None:
        with patch("app.core.workspace.settings") as mock_settings:
            mock_settings.workspace_base_dir = str(tmp_path)
            ws1 = await ensure_default_workspace(test_user.id, db_session)
            await db_session.commit()
            ws2 = await ensure_default_workspace(test_user.id, db_session)
            await db_session.commit()

        assert ws1.id == ws2.id

    @pytest.mark.anyio
    async def test_list_workspaces_empty_for_new_user(
        self, db_session: AsyncSession, test_user: User
    ) -> None:
        workspaces = await list_workspaces(test_user.id, db_session)
        assert workspaces == []

    @pytest.mark.anyio
    async def test_list_workspaces_returns_all(
        self, db_session: AsyncSession, test_user: User, tmp_path: Path
    ) -> None:
        with patch("app.core.workspace.settings") as mock_settings:
            mock_settings.workspace_base_dir = str(tmp_path)
            await create_workspace(test_user.id, db_session, name="Main", slug="main")
            await create_workspace(
                test_user.id, db_session, name="Work", slug="work", is_default=False
            )
            await db_session.commit()

        workspaces = await list_workspaces(test_user.id, db_session)
        assert len(workspaces) == 2

    @pytest.mark.anyio
    async def test_unique_index_blocks_duplicate_default_insert(
        self, db_session: AsyncSession, test_user: User, tmp_path: Path
    ) -> None:
        """Regression test for pawrrtal-pq4r.

        Applies the partial unique index from migration 009 directly to the
        in-memory test DB and verifies that a second direct INSERT of a default
        workspace raises IntegrityError — proving the constraint actually fires
        before the application-level recovery path is even needed.
        """
        from sqlalchemy import text
        from sqlalchemy.exc import IntegrityError as SAIntegrityError

        # Manually apply migration 009's partial unique index to the test DB.
        # (conftest uses Base.metadata.create_all, not Alembic, so this
        # would not exist otherwise.)
        await db_session.execute(
            text(
                "CREATE UNIQUE INDEX IF NOT EXISTS "
                "uq_workspaces_one_default_per_user "
                "ON workspaces (user_id) "
                "WHERE is_default = true"
            )
        )
        await db_session.commit()

        # Create the first default workspace — must succeed.
        with patch("app.core.workspace.settings") as mock_settings:
            mock_settings.workspace_base_dir = str(tmp_path)
            ws1 = await create_workspace(test_user.id, db_session)
            await db_session.commit()

        # Attempt a second default workspace via a savepoint so the session
        # stays alive after the expected constraint violation.
        caught = False
        with patch("app.core.workspace.settings") as mock_settings:
            mock_settings.workspace_base_dir = str(tmp_path)
            try:
                async with db_session.begin_nested():
                    await create_workspace(test_user.id, db_session)
            except SAIntegrityError:
                caught = True

        assert caught, "Expected IntegrityError from unique index — constraint is not applied"

        # Only the first workspace must remain.
        from sqlalchemy import func
        from sqlalchemy import select as sa_select

        from app.models import Workspace

        count_result = await db_session.execute(
            sa_select(func.count())
            .select_from(Workspace)
            .where(
                Workspace.user_id == test_user.id,
                Workspace.is_default.is_(True),
            )
        )
        assert count_result.scalar_one() == 1
        assert (await get_default_workspace(test_user.id, db_session)).id == ws1.id  # type: ignore[union-attr]

    @pytest.mark.anyio
    async def test_ensure_default_workspace_handles_integrity_error(
        self, db_session: AsyncSession, test_user: User, tmp_path: Path
    ) -> None:
        """ensure_default_workspace must recover cleanly when a concurrent
        request already committed the workspace (simulated via IntegrityError).

        We mock ``create_workspace`` to raise ``IntegrityError`` after first
        seeding the DB row directly, so the subsequent re-fetch in the except
        branch has a real row to return.
        """
        from sqlalchemy.exc import IntegrityError as SAIntegrityError

        # First, create the workspace directly so it already exists in the DB.
        with patch("app.core.workspace.settings") as mock_settings:
            mock_settings.workspace_base_dir = str(tmp_path)
            real_ws = await create_workspace(test_user.id, db_session)
            await db_session.commit()

        # Now patch create_workspace to raise IntegrityError, simulating the
        # race where two requests both passed the "no existing workspace" check
        # before either committed.
        with (
            patch("app.core.workspace.settings") as mock_settings,
            patch(
                "app.crud.workspace.create_workspace",
                side_effect=SAIntegrityError("mock", {}, Exception()),
            ),
        ):
            mock_settings.workspace_base_dir = str(tmp_path)
            # ensure_default_workspace should catch the IntegrityError,
            # re-fetch, and return the already-committed row.
            recovered_ws = await ensure_default_workspace(test_user.id, db_session)

        assert recovered_ws.id == real_ws.id


# ---------------------------------------------------------------------------
# Workspace API
# ---------------------------------------------------------------------------


class TestWorkspaceAPI:
    @pytest.mark.anyio
    async def test_list_workspaces_empty(self, client: AsyncClient) -> None:
        resp = await client.get("/api/v1/workspaces")
        assert resp.status_code == 200
        assert resp.json() == []

    @pytest.mark.anyio
    async def test_list_workspaces_returns_created(
        self,
        client: AsyncClient,
        db_session: AsyncSession,
        test_user: User,
        tmp_path: Path,
    ) -> None:
        with patch("app.core.workspace.settings") as mock_settings:
            mock_settings.workspace_base_dir = str(tmp_path)
            await create_workspace(test_user.id, db_session)
            await db_session.commit()

        resp = await client.get("/api/v1/workspaces")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 1
        assert data[0]["name"] == "Main"

    @pytest.mark.anyio
    async def test_tree_returns_seeded_files(
        self,
        client: AsyncClient,
        db_session: AsyncSession,
        test_user: User,
        tmp_path: Path,
    ) -> None:
        with patch("app.core.workspace.settings") as mock_settings:
            mock_settings.workspace_base_dir = str(tmp_path)
            ws = await create_workspace(test_user.id, db_session)
            await db_session.commit()

        resp = await client.get(f"/api/v1/workspaces/{ws.id}/tree")
        assert resp.status_code == 200
        names = {node["name"] for node in resp.json()["nodes"]}
        assert "AGENTS.md" in names
        assert "USER.md" in names
        assert "memory" in names

    @pytest.mark.anyio
    async def test_tree_returns_404_for_unknown_workspace(
        self, client: AsyncClient
    ) -> None:
        resp = await client.get(f"/api/v1/workspaces/{uuid.uuid4()}/tree")
        assert resp.status_code == 404

    @pytest.mark.anyio
    async def test_read_file_returns_content(
        self,
        client: AsyncClient,
        db_session: AsyncSession,
        test_user: User,
        tmp_path: Path,
    ) -> None:
        with patch("app.core.workspace.settings") as mock_settings:
            mock_settings.workspace_base_dir = str(tmp_path)
            ws = await create_workspace(test_user.id, db_session)
            await db_session.commit()

        resp = await client.get(f"/api/v1/workspaces/{ws.id}/files/AGENTS.md")
        assert resp.status_code == 200
        assert "AGENTS.md" in resp.json()["content"]

    @pytest.mark.anyio
    async def test_read_file_404_for_missing(
        self,
        client: AsyncClient,
        db_session: AsyncSession,
        test_user: User,
        tmp_path: Path,
    ) -> None:
        with patch("app.core.workspace.settings") as mock_settings:
            mock_settings.workspace_base_dir = str(tmp_path)
            ws = await create_workspace(test_user.id, db_session)
            await db_session.commit()

        resp = await client.get(f"/api/v1/workspaces/{ws.id}/files/DOES_NOT_EXIST.md")
        assert resp.status_code == 404

    @pytest.mark.anyio
    async def test_write_then_read_file(
        self,
        client: AsyncClient,
        db_session: AsyncSession,
        test_user: User,
        tmp_path: Path,
    ) -> None:
        with patch("app.core.workspace.settings") as mock_settings:
            mock_settings.workspace_base_dir = str(tmp_path)
            ws = await create_workspace(test_user.id, db_session)
            await db_session.commit()

        content = "# My Note\n\nHello from the test.\n"
        put_resp = await client.put(
            f"/api/v1/workspaces/{ws.id}/files/memory/2026-05-06.md",
            json={"content": content},
        )
        assert put_resp.status_code == 200

        get_resp = await client.get(
            f"/api/v1/workspaces/{ws.id}/files/memory/2026-05-06.md"
        )
        assert get_resp.status_code == 200
        assert get_resp.json()["content"] == content

    @pytest.mark.anyio
    async def test_delete_file(
        self,
        client: AsyncClient,
        db_session: AsyncSession,
        test_user: User,
        tmp_path: Path,
    ) -> None:
        with patch("app.core.workspace.settings") as mock_settings:
            mock_settings.workspace_base_dir = str(tmp_path)
            ws = await create_workspace(test_user.id, db_session)
            await db_session.commit()

        # Write a file first.
        await client.put(
            f"/api/v1/workspaces/{ws.id}/files/artifacts/output.txt",
            json={"content": "some output"},
        )
        del_resp = await client.delete(
            f"/api/v1/workspaces/{ws.id}/files/artifacts/output.txt"
        )
        assert del_resp.status_code == 204

        get_resp = await client.get(
            f"/api/v1/workspaces/{ws.id}/files/artifacts/output.txt"
        )
        assert get_resp.status_code == 404

    @pytest.mark.anyio
    async def test_path_traversal_is_rejected(
        self,
        client: AsyncClient,
        db_session: AsyncSession,
        test_user: User,
        tmp_path: Path,
    ) -> None:
        with patch("app.core.workspace.settings") as mock_settings:
            mock_settings.workspace_base_dir = str(tmp_path)
            ws = await create_workspace(test_user.id, db_session)
            await db_session.commit()

        resp = await client.get(f"/api/v1/workspaces/{ws.id}/files/../../../etc/passwd")
        # Either 400 (traversal blocked) or 404 (path normalised to inside workspace).
        assert resp.status_code in (400, 404)
