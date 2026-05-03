from fastapi_users.db import SQLAlchemyUserDatabase
from fastapi_users.exceptions import UserNotExists

from app.core.config import settings
from app.db import User, async_session_maker
from app.schemas import UserCreate
from app.users import UserManager


async def seed_admin_user() -> None:
    """Create an admin user if one doesn't already exist."""
    if (not settings.admin_email) or (not settings.admin_password):
        return  # Admin credentials not set, skip seeding

    async with async_session_maker() as session:
        user_db = SQLAlchemyUserDatabase(session, User)
        manager = UserManager(user_db)
        try:
            await manager.get_by_email(settings.admin_email)
        except UserNotExists:
            await manager.create(
                UserCreate(
                    email=settings.admin_email,
                    password=settings.admin_password,
                    invite_code=settings.registration_secret,
                ),
                safe=False,
            )
