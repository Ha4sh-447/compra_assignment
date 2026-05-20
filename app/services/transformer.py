"""
JSON transformation engine — applies validated mutations to the layout state.
Handles all 7 operation types with coordinate sync and proportional reflow.
"""

import math
import copy

from app.models.layout import LayoutElement, LayoutState
from app.models.mutation import MutateLayoutCall


def sync_normalised(element: LayoutElement, canvas_w: int, canvas_h: int) -> None:
    """Recompute normalised coords from absolute values. Single source of truth = absolute."""
    if canvas_w > 0:
        element.nx = element.x / canvas_w
        element.nw = element.width / canvas_w
    if canvas_h > 0:
        element.ny = element.y / canvas_h
        element.nh = element.height / canvas_h


def _find_element(layout: LayoutState, node_id: str) -> LayoutElement | None:
    """Find an element by ID."""
    for el in layout.elements:
        if el.id == node_id:
            return el
    return None


def _apply_node_mutation(
    element: LayoutElement,
    mutation_data: dict,
    canvas_w: int,
    canvas_h: int,
) -> None:
    """Apply a single node mutation and sync normalised coords."""
    if "x" in mutation_data and mutation_data["x"] is not None:
        element.x = mutation_data["x"]
    if "y" in mutation_data and mutation_data["y"] is not None:
        element.y = mutation_data["y"]
    if "width" in mutation_data and mutation_data["width"] is not None:
        element.width = mutation_data["width"]
    if "height" in mutation_data and mutation_data["height"] is not None:
        element.height = mutation_data["height"]
    if "fontSize" in mutation_data and mutation_data["fontSize"] is not None:
        style = element.style or {}
        visual = style.get("visual", {})
        visual["fontSize"] = mutation_data["fontSize"]
        style["visual"] = visual
        element.style = style
    if "fontSizeRatio" in mutation_data and mutation_data["fontSizeRatio"] is not None:
        element.fontSizeRatio = mutation_data["fontSizeRatio"]

    sync_normalised(element, canvas_w, canvas_h)


def reflow_for_canvas(layout: LayoutState, new_w: int, new_h: int) -> LayoutState:
    """
    Proportional reflow for canvas resize (e.g., 1080×1080 → 1080×1920).
    Scales all non-locked elements proportionally.
    """
    old_w = layout.canvas_width
    old_h = layout.canvas_height

    if old_w == 0 or old_h == 0:
        return layout

    scale_x = new_w / old_w
    scale_y = new_h / old_h
    font_scale = math.sqrt(scale_x * scale_y)

    for el in layout.elements:
        if el.locked:
            if el.width >= old_w * 0.9 and el.height >= old_h * 0.9:
                el.width = new_w
                el.height = new_h
            continue

        if el.type == "artboard":
            continue

        el.x *= scale_x
        el.y *= scale_y
        el.width *= scale_x
        el.height *= scale_y

        font_size = (el.style or {}).get("visual", {}).get("fontSize")
        if font_size:
            el.style["visual"]["fontSize"] = round(font_size * font_scale, 1)

        if el.fontSizeRatio:
            el.fontSizeRatio = el.fontSizeRatio * font_scale

        sync_normalised(el, new_w, new_h)

    layout.canvas_width = new_w
    layout.canvas_height = new_h

    return layout


def apply_mutations(layout: LayoutState, mutation: MutateLayoutCall) -> LayoutState:
    """
    Apply a validated MutateLayoutCall to the layout.
    Returns a new LayoutState (deep copy for undo support).
    """
    layout = LayoutState(**copy.deepcopy(layout.model_dump()))

    canvas_w = layout.canvas_width
    canvas_h = layout.canvas_height

    if mutation.operation == "resize_canvas":
        new_w = mutation.canvas_width or canvas_w
        new_h = mutation.canvas_height or canvas_h
        layout = reflow_for_canvas(layout, new_w, new_h)

        for nm in mutation.mutations:
            element = _find_element(layout, nm.node_id)
            if element and not element.locked:
                mutation_data = nm.model_dump(exclude_none=True, exclude={"node_id"})
                if mutation_data:
                    _apply_node_mutation(element, mutation_data, new_w, new_h)
        return layout

    for nm in mutation.mutations:
        element = _find_element(layout, nm.node_id)
        if not element:
            continue

        if element.locked:
            continue

        mutation_data = nm.model_dump(exclude_none=True, exclude={"node_id"})
        if mutation_data:
            _apply_node_mutation(element, mutation_data, canvas_w, canvas_h)

    return layout

