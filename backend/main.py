"""
FastAPI application entry point.

Defines all API routes, configures middleware, and wires up authentication.
"""

from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.chat import get_chat_router
from app.api.conversations import get_conversations_router
from app.api.models import get_models_router
from app.core.config import settings
from app.db import create_db_and_tables
from app.schemas import (
    UserCreate,
    UserRead,
    UserUpdate,
)
from app.users import auth_backend, fastapi_users

# --- Lifespan ----------------------------------------------------------------


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Run startup tasks (database table creation) before the app begins serving."""
    await create_db_and_tables()
    yield


# --- App & Middleware --------------------------------------------------------


def create_app() -> FastAPI:
    """
    Create a FastAPI app instance with middleware and routes.
    """
    fastapi_app = FastAPI(lifespan=lifespan)
    fastapi_app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    fastapi_app.include_router(
        fastapi_users.get_auth_router(auth_backend), prefix="/auth/jwt", tags=["auth"]
    )
    fastapi_app.include_router(
        fastapi_users.get_register_router(UserRead, UserCreate),
        prefix="/auth",
        tags=["auth"],
    )
    fastapi_app.include_router(
        fastapi_users.get_users_router(UserRead, UserUpdate),
        prefix="/users",
        tags=["users"],
    )

    # Custom API routes for conversations and chat.
    fastapi_app.include_router(
        get_conversations_router(),
    )
    fastapi_app.include_router(
        get_chat_router(),
    )
    fastapi_app.include_router(
        get_models_router(),
    )

    return fastapi_app


# Create the app instance.
app = create_app()
