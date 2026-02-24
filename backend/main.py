import json
import uuid
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager
from typing import List, Optional

from agno.agent import Agent, Message
from agno.db.sqlite import SqliteDb
from agno.models.google import Gemini
from agno.tools.mcp import MCPTools
from dotenv import load_dotenv
from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio.session import AsyncSession

from app.crud.conversation import (
    create_conversation_service,
    get_conversation_service,
    get_conversations_for_user_service,
    update_conversation_title_service,
)
from app.db import User, create_db_and_tables, get_async_session
from app.models import Conversation
from app.schemas import (
    ChatRequest,
    ConversationCreate,
    ConversationResponse,
    UserCreate,
    UserRead,
    UserUpdate,
)
from app.users import auth_backend, current_active_user, fastapi_users

# Load the environment variables.
load_dotenv()


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """
    This function is called when the FastAPI app starts and stops.
    It creates the database tables and yields the app.
    Args:
        app: The FastAPI app.
    Returns:
        None.
    """
    await create_db_and_tables()
    yield


# Create the FastAPI app.
app = FastAPI(lifespan=lifespan)
# Middleware. (We need this to allow the frontend to make requests to the backend).
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# This includes the authentication routes.
app.include_router(
    fastapi_users.get_auth_router(auth_backend), prefix="/auth/jwt", tags=["auth"]
)
# This includes the registration routes.
app.include_router(
    fastapi_users.get_register_router(UserRead, UserCreate),
    prefix="/auth",
    tags=["auth"],
)
# This includes the user routes.
app.include_router(
    fastapi_users.get_users_router(UserRead, UserUpdate),
    prefix="/users",
    tags=["users"],
)

# Create the Agno database.
agno_db = SqliteDb(db_file="agno.db")


@app.get("/api/v1/conversations/{conversation_id}/messages")
async def get_conversation_messages(
    conversation_id: uuid.UUID,
    user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session),
) -> Optional[List[Message]]:
    """
    Get the messages for a conversation.
    Args:
        conversation_id: The ID of the conversation to get the messages for.
        user: The current active user.
    Returns:
        Optional[List[Message]]: The list of messages for the conversation, or None if the conversation is not found.
    """

    conversation = await get_conversation_service(user.id, session, conversation_id)
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    # Need the try/except so that we do not throw errors on new conversations.
    try:
        # We instantiate the agent without a session_id.
        # Because we're going to get the messages from the Agno database.
        agent = Agent(db=agno_db)
        # Get the chat history for the conversation.
        chat_history = agent.get_chat_history(session_id=str(conversation_id))
        print(chat_history)
        return chat_history
    except (ValueError, KeyError, AttributeError):
        return []


@app.get("/api/v1/conversations/{conversation_id}")
async def get_conversation(
    conversation_id: uuid.UUID,
    user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session),
) -> Optional[ConversationResponse]:
    """
    Get a conversation by ID.
    Args:
        conversation_id: The ID of the conversation to get.
        user: The current active user.
        session: The database session.
    Returns:
        ConversationResponse: The response containing the conversation details.
    """
    conversation: Optional[Conversation] = await get_conversation_service(
        user.id, session, conversation_id
    )
    if conversation:
        return ConversationResponse(
            title=conversation.title,
            id=conversation.id,
            user_id=conversation.user_id,
            created_at=conversation.created_at,
            updated_at=conversation.updated_at,
        )

    return None


@app.post("/api/v1/conversations/{conversation_id}/title")
async def generate_conversation_title(
    conversation_id: uuid.UUID,
    first_message: str = None,
    user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session),
) -> str:
    """
    Generate a conversation title.
    Args:
        conversation_id: The ID of the conversation to generate the title for.
        first_message: The first message of the conversation.
        user: The current active user.
        session: The database session.
    Returns:
        The generated title.
    """

    agent = Agent(
        model=Gemini(id="gemini-3-flash-preview"),
    )
    response = agent.run(
        "Generate a title for the conversation based on the first message: "
        + first_message
        + ". Return only the title, no other text or explanation.",
    )

    # Update the conversation title.
    await update_conversation_title_service(
        title=response.content,
        user_id=user.id,
        conversation_id=conversation_id,
        session=session,
    )
    print(response.content)
    return response.content


@app.get("/api/v1/conversations")
async def list_conversations(
    user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session),
) -> List[ConversationResponse]:
    """
    List all conversations for the current user.
    Args:
        user: The current active user.
        session: The database session.
    Returns:
        List[ConversationResponse]: The list of conversations for the current user.
    """

    conversations: List[Conversation] = await get_conversations_for_user_service(
        user.id, session
    )
    return [
        ConversationResponse(
            title=conversation.title,
            id=conversation.id,
            user_id=conversation.user_id,
            created_at=conversation.created_at,
            updated_at=conversation.updated_at,
        )
        for conversation in conversations
    ]


@app.post("/api/v1/conversations/{conversation_id}")
async def create_conversation(
    conversation_id: uuid.UUID,
    user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session),
) -> ConversationResponse:
    """
    Create a new conversation.
    Returns:
        ConversationResponse: The response containing the conversation details.
        The response contains the conversation id, title, user id, created at, and updated at.
    Architecture note: This creates a conversation in your database with a default title.
    The actual title will be generated by LLM based on first message.
    """

    new_conversation: Conversation = await create_conversation_service(
        user.id, session, ConversationCreate(id=conversation_id)
    )
    # Return the conversation response.
    return ConversationResponse(
        title=new_conversation.title,
        id=new_conversation.id,
        user_id=new_conversation.user_id,
        created_at=new_conversation.created_at,
        updated_at=new_conversation.updated_at,
    )


@app.post("/api/chat")
async def chat(
    request: ChatRequest,
    user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session),
) -> StreamingResponse:
    """
    This endpoint is used to chat with the Agno agent.
    Args:
        request: The request to the chat API.
        user: The current active user.
    Returns:
        A StreamingResponse object.
        The StreamingResponse object contains response from the Agno agent.
        The response is returned as a stream of events.
        The events are returned as a JSON object with a "type" key and a "content" key.
        The "type" key is either "delta" or "done".

    Architecture Overview:
    ------------------------
    Your Database: Stores conversation metadata (title, user_id, id)
    Agno Database: Stores actual messages and conversation history
    Link: Use your Conversation.id as Agno's session_id

    Flow:
    1. Frontend creates conversation via POST /api/v1/conversations
    2. Frontend sends chat with conversation_id
    3. Backend uses conversation_id as Agno's session_id
    4. Agno persists messages with that session_id
    5. Frontend can retrieve history via your API or Agno API
    """
    # We assume that the frontend passed a valid conversation_id that belongs to the user.
    conversation_id = request.conversation_id

    # We must first check if the conversationid provided exists and belongs to the user. This is important for security, so that users cannot access conversations that do not belong to them.
    user_conversation: Optional[Conversation] = await get_conversation_service(
        user.id, session, conversation_id
    )

    # We now make sure that we got something, and if we did not, then we create a new conversation.
    if user_conversation is None:
        return None

    # Create to Agno agent. We use the conversation_id as the session_id for Agno,
    # so that Agno can persist the messages and history for that conversation.
    agno_agent = Agent(
        name="Agno Agent",
        user_id=str(user.id),
        session_id=(str(conversation_id)),
        # When updating this, apparently the server needs to be restarted (?)
        model=Gemini(id="gemini-3-flash-preview"),
        # Add a database to the Agent
        db=agno_db,
        # Add to Agno MCP server to the Agent
        tools=[MCPTools(transport="streamable-http", url="https://docs.agno.com/mcp")],
        # Add to previous session history to the context
        add_history_to_context=True,
        num_history_runs=3,
        markdown=True,
    )

    def event_stream():
        """
        Stream!
        """
        # Iterate Agno's streaming events
        for ev in agno_agent.run(request.question, stream=True):
            chunk = getattr(ev, "content", None)
            if chunk:
                # Send a "delta" payload to the client
                payload = {"type": "delta", "content": chunk}
                yield f"data: {json.dumps(payload)}\n\n"

        # Signal completion
        yield "data: [DONE]\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )
