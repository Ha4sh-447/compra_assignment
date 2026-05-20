"""
Session state management — in-memory store for conversation history,
undo/redo stacks, and anaphora resolution.
"""

import copy
import uuid

from app.models.layout import LayoutState
from app.models.session import SessionState

_sessions: dict[str, SessionState] = {}

MAX_SNAPSHOTS = 20
MAX_HISTORY_TURNS = 6


def get_or_create_session(session_id: str | None, initial_layout: LayoutState) -> SessionState:
    """Get existing session or create a new one."""
    if not session_id:
        session_id = str(uuid.uuid4())

    if session_id in _sessions:
        return _sessions[session_id]

    session = SessionState(
        session_id=session_id,
        history=[],
        layout_snapshots=[],
        redo_stack=[],
        current_layout=copy.deepcopy(initial_layout),
        lastMutatedIds=[],
    )
    _sessions[session_id] = session
    return session


def push_snapshot(session: SessionState, layout: LayoutState) -> None:
    """Push the current layout onto the undo stack before applying a new mutation."""
    snapshot = LayoutState(**copy.deepcopy(session.current_layout.model_dump()))
    session.layout_snapshots.append(snapshot)

    if len(session.layout_snapshots) > MAX_SNAPSHOTS:
        session.layout_snapshots = session.layout_snapshots[-MAX_SNAPSHOTS:]

    session.redo_stack.clear()

    session.current_layout = layout


def undo(session: SessionState) -> LayoutState | None:
    """Pop the last snapshot from the undo stack. Returns None if no history."""
    if not session.layout_snapshots:
        return None

    session.redo_stack.append(
        LayoutState(**copy.deepcopy(session.current_layout.model_dump()))
    )

    session.current_layout = session.layout_snapshots.pop()
    return session.current_layout


def redo(session: SessionState) -> LayoutState | None:
    """Re-apply the last undone mutation. Returns None if no redo history."""
    if not session.redo_stack:
        return None

    session.layout_snapshots.append(
        LayoutState(**copy.deepcopy(session.current_layout.model_dump()))
    )

    session.current_layout = session.redo_stack.pop()
    return session.current_layout


def add_turn(session: SessionState, role: str, content: str) -> None:
    """Add a conversation turn, keeping a rolling window of MAX_HISTORY_TURNS."""
    session.history.append({"role": role, "content": content})
    if len(session.history) > MAX_HISTORY_TURNS:
        session.history = session.history[-MAX_HISTORY_TURNS:]


def update_last_mutated(session: SessionState, node_ids: list[str]) -> None:
    """Update lastMutatedIds for anaphora resolution."""
    session.lastMutatedIds = node_ids

