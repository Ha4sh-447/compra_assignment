from typing import Any
from typing import Dict
from typing import Optional
from pydantic import BaseModel


class LayoutElement(BaseModel):
    id: str
    node_id: str
    type: str

    x: float
    y: float
    nx: float
    ny: float

    height: float
    nh: float
    width: float
    nw: float

    name: Optional[str] = None
    parentId: Optional[str] = None

    data: Optional[Dict[str, Any]] = {}
    style: Optional[Dict[str, Any]] = {}

class LayoutState(BaseModel):
    canvas_width: int
    canvas_height: int

    elements: list[LayoutElement]

