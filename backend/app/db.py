"""
Database configuration and session management.

Uses SQLAlchemy async engine with postgresql. The User model is defined here
(rather than in models.py) because fastapi-users requires it at import time
for its dependency chain.
"""

from collections.abc import AsyncGenerator

from fastapi import Depends
from fastapi_users.db import SQLAlchemyBaseUserTableUUID, SQLAlchemyUserDatabase
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.core.config import settings


class Base(DeclarativeBase):
    """Base class for all SQLAlchemy ORM models."""

    pass


class User(SQLAlchemyBaseUserTableUUID, Base):
    """User model provided by fastapi-users (id, email, hashed_password, is_active, etc.)."""

    pass


engine = create_async_engine(settings.db_url_async)
async_session_maker = async_sessionmaker(engine, expire_on_commit=False)


async def create_db_and_tables() -> None:
    """Create all tables on application startup.

    Imports app.models to ensure every ORM model is registered with
    ``Base.metadata`` before issuing CREATE TABLE statements.
    """
    from . import models  # noqa: F401 — side-effect import to register models

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def get_async_session() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency that yields an async database session."""
    async with async_session_maker() as session:
        yield session


async def get_user_db(session: AsyncSession = Depends(get_async_session)):
    """FastAPI dependency that yields a fastapi-users database adapter."""
    yield SQLAlchemyUserDatabase(session, User)
