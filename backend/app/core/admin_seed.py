from fastapi_users.db import SQLAlchemyUserDatabase

from app.core.config import settings
from app.db import User, async_session_maker
from app.schemas import UserCreate
from app.users import UserManager


async def seed_admin_user() -> None:
    if (not settings.admin_email) or (not settings.admin_password):
        return  # Admin credentials not set, skip seeding

    """Create an admin user if one doesn't already exist."""
    async with async_session_maker() as session:
        user_db = SQLAlchemyUserDatabase(session, User)
        manager = UserManager(user_db)
        existing = await manager.get_by_email(settings.admin_email)
        if not existing:
            await manager.create(
                UserCreate(
                    email=settings.admin_email,
                    password=settings.admin_password,
                    invite_code=settings.registration_secret,
                ),
                safe=False,
            )
