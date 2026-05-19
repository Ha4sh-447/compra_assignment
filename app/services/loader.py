import json

from app.models.layout import LayoutElement, LayoutState


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
            id=node["id"],
            node_id = node_id, 
            type=node["type"],

            x=node["x"],
            nx=node.get("nx", 0.0),
            y=node["y"],
            ny=node.get("ny", 0.0),

            width=node["width"],
            nw=node.get("nw", 0.0),
            height=node["height"],
            nh=node.get("nh", 0.0),

            name=node.get("name"),
            parentId=node.get("parentId"),

            style=node.get("style", {}),
            data=node.get("data", {})
        )

        elements.append(element)

    return LayoutState(
        canvas_width=canvas_width,
        canvas_height=canvas_height,
        elements=elements
    )

def get_element_map(layout: LayoutState) -> dict[str, str]:
    element_map = {}

    for element in layout.elements:
        text = element.name + element.type + element.data.get("content", "") + element.data.get("cover", "")
        element_map[element.id] = text
    return element_map
