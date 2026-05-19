from app.services.parser import parse_instruction
from fastapi import FastAPI

from app.services.loader import get_element_map, load_layout
from app.services.transformer import apply_command

app = FastAPI()

layout_state = load_layout( "app/data/data.json")
element_map = get_element_map(layout_state)

@app.post("/chat")
def chat(payload: dict):
    
    global layout_state

    instruction = payload["message"]

    command = parse_instruction(
            instruction
            )

    layout_state= apply_command(
            layout_state,
            command
            )

    return {
            "command": command.model_dump(),
            "layout": layout_state.model_dump()
            }

