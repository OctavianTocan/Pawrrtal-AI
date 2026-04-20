"""
Database configuration and session management.

Uses SQLAlchemy async engine with PostgreSQL or local SQLite. The User model is defined here
(rather than in models.py) because fastapi-users requires it at import time
for its dependency chain.
"""

from collections.abc import AsyncGenerator
import asyncio
import logging

from fastapi import Depends
from fastapi_users.db import SQLAlchemyBaseUserTableUUID, SQLAlchemyUserDatabase
from sqlalchemy import text
from sqlalchemy.exc import OperationalError
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.core.config import settings

logger = logging.getLogger(__name__)

MAX_RETRIES = 5
RETRY_DELAY_SECONDS = 5


engine_kwargs = {"connect_args": {"check_same_thread": False}} if settings.is_sqlite else {}


class Base(DeclarativeBase):
    """Base class for all SQLAlchemy ORM models."""

    pass


class User(SQLAlchemyBaseUserTableUUID, Base):
    """User model provided by fastapi-users (id, email, hashed_password, is_active, etc.)."""

    pass


engine = create_async_engine(settings.db_url_async, **engine_kwargs)
async_session_maker = async_sessionmaker(engine, expire_on_commit=False)


async def _wait_for_db_connection(conn) -> None:
    """Probe the database with a ``SELECT 1`` up to ``MAX_RETRIES`` times.

    Railway cold-starts can leave the database unreachable for several seconds
    after the application process launches. This helper retries with a fixed
    delay so the startup sequence survives that window instead of crashing.
    """
    for attempt in range(MAX_RETRIES):
        try:
            await conn.execute(text("SELECT 1"))
            return
        except OperationalError as e:
            if attempt == MAX_RETRIES - 1:
                logger.warning(
                    "Database connection failed after %d attempts: %s. Giving up.",
                    MAX_RETRIES,
                    e,
                )
                raise
            logger.warning(
                "Database connection failed (attempt %d/%d): %s. Retrying in %d seconds...",
                attempt + 1,
                MAX_RETRIES,
                e,
                RETRY_DELAY_SECONDS,
            )
            await asyncio.sleep(RETRY_DELAY_SECONDS)


async def create_db_and_tables() -> None:
    """Create all tables on application startup.

    Imports app.models to ensure every ORM model is registered with
    ``Base.metadata`` before issuing CREATE TABLE statements.
    """
    from . import models  # noqa: F401 — side-effect import to register models

    async with engine.begin() as conn:
        await _wait_for_db_connection(conn)
        await conn.run_sync(Base.metadata.create_all)


async def get_async_session() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency that yields an async database session."""
    async with async_session_maker() as session:
        yield session


async def get_user_db(session: AsyncSession = Depends(get_async_session)):
    """FastAPI dependency that yields a fastapi-users database adapter."""
    yield SQLAlchemyUserDatabase(session, User)
