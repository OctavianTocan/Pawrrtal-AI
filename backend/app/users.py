"""
Authentication and user management configuration.

Uses fastapi-users with JWT tokens transported via HTTP-only cookies.
"""

import uuid
from collections.abc import AsyncGenerator
from typing import Optional

from fastapi import Depends, Request, Response
from fastapi_users import BaseUserManager, FastAPIUsers, UUIDIDMixin
from fastapi_users.authentication import (
    AuthenticationBackend,
    CookieTransport,
    JWTStrategy,
)
from fastapi_users.db import SQLAlchemyUserDatabase
from typing_extensions import cast

from app.core.config import settings
from app.db import User, get_user_db


class UserManager(UUIDIDMixin, BaseUserManager[User, uuid.UUID]):
    """Handles user lifecycle events (registration, login, password reset)."""

    reset_password_token_secret = settings.auth_secret
    verification_token_secret = settings.auth_secret

    async def on_after_register(
        self, user: User, request: Optional[Request] = None
    ) -> None:
        """Hook called after a new user registers."""

    async def on_after_login(
        self,
        user: User,
        request: Optional[Request] = None,
        response: Optional[Response] = None,
    ) -> None:
        """Hook called after a user logs in."""


async def get_user_manager(
    user_db: SQLAlchemyUserDatabase[User, uuid.UUID] = Depends(get_user_db),
) -> AsyncGenerator[UserManager, None]:
    """FastAPI dependency that yields a ``UserManager`` instance."""
    yield UserManager(user_db)


# --- Transport & Strategy ---------------------------------------------------

should_secure_cookie = (
    settings.is_production
)  # Use secure cookies in production, but allow non-secure in development

cookie_transport = CookieTransport(
    cookie_name="session_token",
    cookie_httponly=True,
    cookie_secure=should_secure_cookie,
    cookie_samesite="lax",
    cookie_max_age=3600,
    cookie_domain=settings.cookie_domain,
)


def get_jwt_strategy() -> JWTStrategy:
    """Create a JWT strategy with a 1-hour lifetime."""
    return JWTStrategy(secret=cast(str, settings.auth_secret), lifetime_seconds=3600)


auth_backend = AuthenticationBackend(
    name="jwt",
    transport=cookie_transport,
    get_strategy=get_jwt_strategy,
)

# --- FastAPI-Users instance --------------------------------------------------

fastapi_users = FastAPIUsers[User, uuid.UUID](
    get_user_manager,
    [auth_backend],
)

current_active_user = fastapi_users.current_user(active=True)
