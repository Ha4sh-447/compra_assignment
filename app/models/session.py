from pydantic import BaseModel

from app.models.layout import LayoutState


class SessionState(BaseModel):
    """Per-session state for conversation + layout history."""
    session_id: str
    history: list[dict] = []
    layout_snapshots: list[LayoutState] = []
    redo_stack: list[LayoutState] = []
    current_layout: LayoutState
    lastMutatedIds: list[str] = []

