"""
Database configuration and session management.

Uses SQLAlchemy async engine with PostgreSQL or local SQLite. The User model is defined here
(rather than in models.py) because fastapi-users requires it at import time
for its dependency chain.
"""

from collections.abc import AsyncGenerator
import asyncio

from fastapi import Depends
from fastapi_users.db import SQLAlchemyBaseUserTableUUID, SQLAlchemyUserDatabase
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.core.config import settings


engine_kwargs = {"connect_args": {"check_same_thread": False}} if settings.is_sqlite else {}


class Base(DeclarativeBase):
    """Base class for all SQLAlchemy ORM models."""

    pass


class User(SQLAlchemyBaseUserTableUUID, Base):
    """User model provided by fastapi-users (id, email, hashed_password, is_active, etc.)."""

    pass


engine = create_async_engine(settings.db_url_async, **engine_kwargs)
async_session_maker = async_sessionmaker(engine, expire_on_commit=False)


async def create_db_and_tables() -> None:
    """Create all tables on application startup.

    Imports app.models to ensure every ORM model is registered with
    ``Base.metadata`` before issuing CREATE TABLE statements.
    """
    from . import models  # noqa: F401 — side-effect import to register models

    # We're running the backend serverless on Railway, so it's possible that the database connection isn't immediately available when the app starts.
    for i in range(5):
        try:
            async with engine.begin() as conn:
                await conn.execute(text("SELECT 1"))  # Test the connection

                await conn.run_sync(Base.metadata.create_all)
            break  # If successful, exit the loop
        except Exception as e:
            if i < 4:  # If it's not the last attempt, wait and retry
                print(f"Database connection failed (attempt {i + 1}/5): {e}. Retrying in 5 seconds...")
                await asyncio.sleep(5)
            else:
                print(f"Database connection failed after 5 attempts: {e}. Exiting.")
                raise


async def get_async_session() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency that yields an async database session."""
    async with async_session_maker() as session:
        yield session


async def get_user_db(session: AsyncSession = Depends(get_async_session)):
    """FastAPI dependency that yields a fastapi-users database adapter."""
    yield SQLAlchemyUserDatabase(session, User)
