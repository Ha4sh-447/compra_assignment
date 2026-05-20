"""
FastAPI application — chat-based layout agent API.
"""

import logging
import time

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional

from app.services.loader import load_layout
from app.services.llm import call_layout_agent
from app.services.sanitiser import sanitise_input
from app.services.validator import validate_mutation, clamp_mutation
from app.services.transformer import apply_mutations
from app.services.annotator import annotate_roles
from app.services.tracing import add_trace, get_traces, clear_traces
from app.services.session import (
    get_or_create_session,
    push_snapshot,
    undo,
    redo,
    add_turn,
    update_last_mutated,
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Layout Agent", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

_initial_layout = load_layout("app/data/data.json")


class ChatRequest(BaseModel):
    session_id: Optional[str] = None
    message: str


class ChatResponse(BaseModel):
    session_id: str
    status: str
    message: str
    layout: Optional[dict] = None
    mutation: Optional[dict] = None


class SessionResponse(BaseModel):
    session_id: str
    status: str
    message: str
    layout: Optional[dict] = None


@app.post("/chat", response_model=ChatResponse)
async def chat(payload: ChatRequest):
    """Main chat endpoint — processes a layout instruction."""
    start_time = time.time()

    clean_message = sanitise_input(payload.message)
    if not clean_message:
        return ChatResponse(
            session_id=payload.session_id or "",
            status="error",
            message="Empty message after sanitisation. Please send a valid instruction.",
        )

    session = get_or_create_session(payload.session_id, _initial_layout)

    annotated_layout = annotate_roles(session.current_layout)

    agent_response = await call_layout_agent(
        instruction=clean_message,
        current_layout=annotated_layout,
        history=session.history,
        last_mutated_ids=session.lastMutatedIds,
    )

    latency_ms = (time.time() - start_time) * 1000

    if agent_response.status != "success" or agent_response.mutation is None:
        add_turn(session, "user", clean_message)
        add_turn(session, "assistant", agent_response.message)

        add_trace(
            latency_ms=latency_ms,
            model=agent_response.model_used or "unknown",
            user_input=clean_message,
            system_prompt=agent_response.system_prompt or "",
            history=session.history[:-2],
            raw_response=agent_response.raw_response,
            validation_passed=True,
            validation_errors=[],
        )

        return ChatResponse(
            session_id=session.session_id,
            status=agent_response.status,
            message=agent_response.message,
            layout=session.current_layout.model_dump(),
        )

    valid_ids = {el.id for el in session.current_layout.elements}
    is_valid, errors = validate_mutation(agent_response.mutation, valid_ids)
    if not is_valid:
        error_msg = f"Mutation validation failed: {'; '.join(errors)}"
        logger.warning(error_msg)
        add_turn(session, "user", clean_message)
        add_turn(session, "assistant", error_msg)

        add_trace(
            latency_ms=latency_ms,
            model=agent_response.model_used or "unknown",
            user_input=clean_message,
            system_prompt=agent_response.system_prompt or "",
            history=session.history[:-2],
            raw_response=agent_response.raw_response,
            validation_passed=False,
            validation_errors=errors,
        )

        return ChatResponse(
            session_id=session.session_id,
            status="error",
            message=error_msg,
            layout=session.current_layout.model_dump(),
        )

    clamped = clamp_mutation(
        agent_response.mutation,
        session.current_layout.canvas_width,
        session.current_layout.canvas_height,
    )

    new_layout = apply_mutations(session.current_layout, clamped)

    push_snapshot(session, new_layout)
    mutated_ids = [nm.node_id for nm in clamped.mutations]
    update_last_mutated(session, mutated_ids)
    add_turn(session, "user", clean_message)
    add_turn(session, "assistant", agent_response.message)

    add_trace(
        latency_ms=latency_ms,
        model=agent_response.model_used or "unknown",
        user_input=clean_message,
        system_prompt=agent_response.system_prompt or "",
        history=session.history[:-2],
        raw_response=agent_response.raw_response,
        validation_passed=True,
        validation_errors=[],
        mutation=clamped.model_dump(),
    )

    return ChatResponse(
        session_id=session.session_id,
        status="success",
        message=agent_response.message,
        layout=new_layout.model_dump(),
        mutation=clamped.model_dump(),
    )


@app.post("/undo", response_model=SessionResponse)
async def undo_mutation(payload: ChatRequest):
    """Undo the last mutation."""
    session = get_or_create_session(payload.session_id, _initial_layout)
    result = undo(session)
    if result is None:
        return SessionResponse(
            session_id=session.session_id,
            status="error",
            message="Nothing to undo.",
            layout=session.current_layout.model_dump(),
        )
    return SessionResponse(
        session_id=session.session_id,
        status="success",
        message="Undone. Reverted to previous layout.",
        layout=result.model_dump(),
    )


@app.post("/redo", response_model=SessionResponse)
async def redo_mutation(payload: ChatRequest):
    """Redo the last undone mutation."""
    session = get_or_create_session(payload.session_id, _initial_layout)
    result = redo(session)
    if result is None:
        return SessionResponse(
            session_id=session.session_id,
            status="error",
            message="Nothing to redo.",
            layout=session.current_layout.model_dump(),
        )
    return SessionResponse(
        session_id=session.session_id,
        status="success",
        message="Redone. Re-applied the last undone mutation.",
        layout=result.model_dump(),
    )


@app.get("/layout")
async def get_layout(session_id: Optional[str] = None):
    """Get the current layout state."""
    session = get_or_create_session(session_id, _initial_layout)
    return {
        "session_id": session.session_id,
        "layout": session.current_layout.model_dump(),
    }


@app.get("/traces")
async def fetch_traces():
    """Retrieve execution traces for LangSmith-like local monitoring."""
    return get_traces()


@app.post("/traces/clear")
async def clear_all_traces():
    """Clear trace history."""
    clear_traces()
    return {"status": "success", "message": "Traces cleared."}

