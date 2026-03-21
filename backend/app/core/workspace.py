from pathlib import Path
from uuid import UUID

from app.core.config import settings


def get_user_workspace(user_id: UUID) -> str:
    """Get the workspace directory for a given user. This function constructs a path based on the `workspace_base_dir` setting and the user's UUID. It ensures that the directory exists by creating it if necessary."""
    workspace = settings.workspace_base_dir + "/" + str(user_id)
    Path(workspace).mkdir(parents=True, exist_ok=True)
    return workspace
