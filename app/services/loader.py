import json

from app.models.layout import LayoutElement, LayoutState
from app.services.annotator import annotate_roles, build_element_descriptors


def load_layout(path: str) -> LayoutState:

    with open(path, "r") as f:
        raw = json.load(f)

    nodes = raw["nodes"]

    elements = []

    canvas_width = 1080
    canvas_height = 1080

    for node_id, node in nodes.items():

        if node["type"] == "artboard":
            canvas_width = node["width"]
            canvas_height = node["height"]

        element = LayoutElement(
            id=node.get("id"),
            node_id = node_id, 
            type=node.get("type"),

            x=node.get("x"),
            nx=node.get("nx", 0.0),
            y=node.get("y"),
            ny=node.get("ny", 0.0),

            width=node.get("width"),
            nw=node.get("nw", 0.0),
            height=node.get("height"),
            nh=node.get("nh", 0.0),

            name=node.get("name"),
            parentId=node.get("parentId"),

            style=node.get("style", {}),
            data=node.get("data", {}),

            fontSizeRatio=node.get("fontSizeRatio"),
            children=node.get("children"),
        )

        elements.append(element)

    layout = LayoutState(
        canvas_width=canvas_width,
        canvas_height=canvas_height,
        elements=elements
    )

    layout = annotate_roles(layout)

    return layout


def get_element_map(layout: LayoutState) -> dict[str, str]:
    """Build a node_id → descriptor map including semantic roles."""
    return build_element_descriptors(layout)
