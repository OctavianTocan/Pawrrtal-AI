import uuid
from typing import List

from agno.agent import Message
from agno.agent.agent import Agent
from agno.db.postgres.postgres import PostgresDb
from agno.db.sqlite.sqlite import SqliteDb
from agno.models.google.gemini import Gemini
from agno.run.agent import RunOutput
from agno.tools.local_file_system import LocalFileSystemTools
from agno.tools.mcp.mcp import MCPTools

from app.core.config import settings
from app.core.workspace import get_user_workspace


# Initialize the Agno database.
if settings.is_sqlite:
    agno_db = SqliteDb(db_url=settings.db_url_sync)
else:
    agno_db = PostgresDb(db_url=settings.db_url_sync)


def create_agent(
    user_id: uuid.UUID,
    conversation_id: uuid.UUID,
    model_id: str = "gemini-3.1-flash-lite-preview",
) -> Agent:
    """
    This function allows us to create an Agno agent.
    """

    # Grab the user's workspace path. This is where the agent will be able to read/write files, so it's important to set this up correctly.
    user_workspace = get_user_workspace(user_id)

    agno_agent = Agent(
        name="Agno Agent",
        user_id=str(user_id),
        session_id=str(conversation_id),
        model=Gemini(id=model_id, api_key=settings.google_api_key),
        db=agno_db,
        tools=[
            MCPTools(transport="streamable-http", url="https://docs.agno.com/mcp"),
            LocalFileSystemTools(target_directory=user_workspace),
        ],
        add_history_to_context=True,
        num_history_runs=3,
        markdown=True,
    )

    return agno_agent


# TODO: I get the feeling that the official Agno repo actually does this in sepparate files? Link: https://github.com/agno-agi/agentos-railway-template
def create_history_reader_agent(conversation_id: uuid.UUID) -> List[Message]:
    """
    Creates an Agno agent to read the conversation history from a given conversation.
    """
    agent = Agent(db=agno_db)
    return agent.get_chat_history(session_id=str(conversation_id))


def create_utility_agent(prompt: str) -> RunOutput:
    """
    Helps with one-off requests, using an Agno agent.
    """
    agent = Agent(
        model=Gemini(id="gemini-3.1-flash-lite-preview", api_key=settings.google_api_key),
    )
    return agent.run(prompt)


# This helps you run this directly.
if __name__ == "__main__":
    agent = create_agent(uuid.uuid4(), uuid.uuid4(), "gemini-3.1-flash-lite-preview")
    agent.print_response("Hello!", stream=True)
