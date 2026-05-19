from typing import Optional
from pydantic import BaseModel

class LayoutCommand(BaseModel):
    action: str

    target: Optional[str] = None

    direction: Optional[str] = None

    changeValue: Optional[str] = None

    aspect_ratio: Optional[str] = None
