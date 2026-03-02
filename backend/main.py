"""
FastAPI application entry point.

Defines all API routes, configures middleware, and wires up authentication.
"""

import json
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager
from typing import Optional

from agno.agent import Agent
from agno.db.sqlite import SqliteDb
from agno.models.google import Gemini
from agno.tools.mcp import MCPTools
from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio.session import AsyncSession

from app.crud.conversation import (
    get_conversation_service,
)
from app.db import User, create_db_and_tables, get_async_session
from app.models import Conversation
from app.schemas import (
    ChatRequest,
    UserCreate,
    UserRead,
    UserUpdate,
)
from app.users import auth_backend, current_active_user, fastapi_users

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

    # TODO: Make CORS origins configurable via environment variable.
    fastapi_app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:3001"],
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

    return fastapi_app


# Create the app instance.
app = create_app()

# --- Agno agent database -----------------------------------------------------

agno_db = SqliteDb(db_file="agno.db")

# --- Chat endpoint -----------------------------------------------------------


@app.post("/api/chat")
async def chat(
    request: ChatRequest,
    user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session),
) -> StreamingResponse:
    """Stream an Agno agent response as Server-Sent Events.

    Architecture:
        - Application DB stores conversation metadata (title, user_id, timestamps).
        - Agno DB stores actual message content and history.
        - They are linked by ``Conversation.id`` == Agno ``session_id``.

    Flow:
        1. Frontend creates conversation via ``POST /api/v1/conversations``.
        2. Frontend sends chat with ``conversation_id``.
        3. Backend uses ``conversation_id`` as Agno's ``session_id``.
        4. Agno persists messages under that session.

    SSE payload format:
        - ``{"type": "delta", "content": "..."}`` for each streamed chunk.
        - ``[DONE]`` sentinel when the response is complete.
    """
    conversation_id = request.conversation_id

    # Ownership check — ensure the conversation belongs to this user.
    user_conversation: Optional[Conversation] = await get_conversation_service(
        user.id, session, conversation_id
    )
    if user_conversation is None:
        return None

    agno_agent = Agent(
        name="Agno Agent",
        user_id=str(user.id),
        session_id=str(conversation_id),
        model=Gemini(id="gemini-3-flash-preview"),
        db=agno_db,
        tools=[MCPTools(transport="streamable-http", url="https://docs.agno.com/mcp")],
        add_history_to_context=True,
        num_history_runs=3,
        markdown=True,
    )

    def event_stream():
        """Yield SSE-formatted chunks from the Agno agent."""
        for ev in agno_agent.run(request.question, stream=True):
            chunk = getattr(ev, "content", None)
            if chunk:
                payload = {"type": "delta", "content": chunk}
                yield f"data: {json.dumps(payload)}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )
