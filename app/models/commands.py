from typing import Optional
from pydantic import BaseModel

from app.models.mutation import MutateLayoutCall
from app.models.layout import LayoutState


class AgentResponse(BaseModel):
    """Response envelope from the layout agent."""
    status: str                  # "success" | "clarification" | "error"
    message: str                 # chat message to show user
    mutation: Optional[MutateLayoutCall] = None
    layout: Optional[LayoutState] = None
    model_used: Optional[str] = None
    system_prompt: Optional[str] = None
    raw_response: Optional[dict] = None
