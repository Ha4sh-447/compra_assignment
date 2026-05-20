from typing import Optional
from pydantic import BaseModel, Field, AliasChoices


class NodeMutation(BaseModel):
    """A single node mutation from the LLM tool call."""
    node_id: str = Field(validation_alias=AliasChoices('node_id', 'nodeId', 'id'))
    x: Optional[float] = None
    y: Optional[float] = None
    width: Optional[float] = Field(None, validation_alias=AliasChoices('width', 'w'))
    height: Optional[float] = Field(None, validation_alias=AliasChoices('height', 'h'))
    fontSize: Optional[float] = Field(None, validation_alias=AliasChoices('fontSize', 'font_size'))
    fontSizeRatio: Optional[float] = Field(None, validation_alias=AliasChoices('fontSizeRatio', 'font_size_ratio'))

    nx: Optional[float] = None
    ny: Optional[float] = None
    nw: Optional[float] = None
    nh: Optional[float] = None


class MutateLayoutCall(BaseModel):
    """Full LLM tool-call response for mutate_layout."""
    operation: str
    reasoning: str
    mutations: list[NodeMutation]
    canvas_width: Optional[int] = Field(None, validation_alias=AliasChoices('canvas_width', 'canvasWidth'))
    canvas_height: Optional[int] = Field(None, validation_alias=AliasChoices('canvas_height', 'canvasHeight'))

