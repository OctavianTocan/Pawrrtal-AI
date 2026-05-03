"""Shared backend test fixtures."""

from collections.abc import AsyncGenerator, Generator
from pathlib import Path
import sys
from uuid import uuid4

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

BACKEND_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_ROOT))

from app import models  # noqa: F401  # Registers ORM models on Base metadata.
from app.db import Base, User, get_async_session
from app.users import current_active_user
from main import create_app


@pytest.fixture
def anyio_backend() -> str:
    """Run anyio-powered async tests on asyncio only."""
    return "asyncio"


@pytest.fixture
def test_user() -> User:
    """Return an active user for request dependency overrides."""
    return User(
        id=uuid4(),
        email="tester@example.com",
        hashed_password="not-used",
        is_active=True,
        is_superuser=False,
        is_verified=True,
    )


@pytest.fixture
async def db_session(test_user: User) -> AsyncGenerator[AsyncSession, None]:
    """Provide an isolated in-memory SQLite database session."""
    engine = create_async_engine(
        "sqlite+aiosqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )

    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)

    session_maker = async_sessionmaker(engine, expire_on_commit=False)
    async with session_maker() as session:
        session.add(test_user)
        await session.commit()
        yield session

    await engine.dispose()


@pytest.fixture
def app_with_overrides(
    db_session: AsyncSession, test_user: User
) -> Generator[object, None, None]:
    """Create a FastAPI app with auth and database dependencies overridden."""
    app = create_app()

    async def override_session() -> AsyncGenerator[AsyncSession, None]:
        yield db_session

    app.dependency_overrides[get_async_session] = override_session
    app.dependency_overrides[current_active_user] = lambda: test_user

    yield app

    app.dependency_overrides.clear()


@pytest.fixture
async def client(app_with_overrides: object) -> AsyncGenerator[AsyncClient, None]:
    """Provide an async HTTP client for the overridden FastAPI app."""
    transport = ASGITransport(app=app_with_overrides)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        yield client
