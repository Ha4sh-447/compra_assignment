"""
Mutation validator — three-layer validation fence for LLM tool-call output.
1. Node ID whitelist check (no hallucinated IDs)
2. Field allowlist check (no disallowed field mutations)
3. Bounds clamping (sane numeric ranges)
"""

from app.models.mutation import MutateLayoutCall, NodeMutation
from app.services.sanitiser import clamp_value

ALLOWED_MUTATION_FIELDS = {
    "x", "y", "width", "height", "fontSize", "fontSizeRatio",
    "nx", "ny", "nw", "nh"
}


def validate_mutation(
    mutation: MutateLayoutCall,
    valid_node_ids: set[str],
) -> tuple[bool, list[str]]:
    """
    Validate a MutateLayoutCall against the current layout.
    Returns (is_valid, list_of_error_messages).
    """
    errors: list[str] = []

    valid_ops = {
        "resize_canvas", "reposition", "resize_element",
        "scale_element", "group_move", "reorder_z", "style_change",
    }
    if mutation.operation not in valid_ops:
        errors.append(f"Unknown operation: {mutation.operation}")

    for nm in mutation.mutations:
        if nm.node_id not in valid_node_ids:
            errors.append(f"Hallucinated node ID: {nm.node_id}")

        set_fields = nm.model_fields_set - {"node_id"}
        disallowed = set_fields - ALLOWED_MUTATION_FIELDS
        if disallowed:
            errors.append(f"Disallowed fields on {nm.node_id}: {disallowed}")

    if mutation.operation == "resize_canvas":
        if mutation.canvas_width is not None and mutation.canvas_width <= 0:
            errors.append("canvas_width must be > 0")
        if mutation.canvas_height is not None and mutation.canvas_height <= 0:
            errors.append("canvas_height must be > 0")

    is_valid = len(errors) == 0
    return is_valid, errors


def _to_absolute(val: float | None, canvas_dim: int) -> float | None:
    """Detect if a value is normalized (strictly between -1.0 and 1.0 and non-zero) and scale it to absolute."""
    if val is None:
        return None
    if val != 0 and -1.0 <= val <= 1.0:
        return val * canvas_dim
    return val


def clamp_mutation(
    mutation: MutateLayoutCall,
    canvas_w: int,
    canvas_h: int,
) -> MutateLayoutCall:
    """
    Clamp all numeric values in a mutation to sane bounds.
    Converts all normalized coordinates to absolute before clamping.
    """
    max_x = canvas_w * 2
    max_y = canvas_h * 2

    for nm in mutation.mutations:
        if nm.nx is not None:
            nm.x = nm.nx * canvas_w
            nm.nx = None
        if nm.ny is not None:
            nm.y = nm.ny * canvas_h
            nm.ny = None
        if nm.nw is not None:
            nm.width = nm.nw * canvas_w
            nm.nw = None
        if nm.nh is not None:
            nm.height = nm.nh * canvas_h
            nm.nh = None

        if nm.x is not None:
            nm.x = _to_absolute(nm.x, canvas_w)
        if nm.y is not None:
            nm.y = _to_absolute(nm.y, canvas_h)
        if nm.width is not None:
            nm.width = _to_absolute(nm.width, canvas_w)
        if nm.height is not None:
            nm.height = _to_absolute(nm.height, canvas_h)

        if nm.x is not None:
            nm.x = clamp_value(nm.x, -max_x, max_x)
        if nm.y is not None:
            nm.y = clamp_value(nm.y, -max_y, max_y)
        if nm.width is not None:
            nm.width = clamp_value(nm.width, 1.0, max_x)
        if nm.height is not None:
            nm.height = clamp_value(nm.height, 1.0, max_y)
        if nm.fontSize is not None:
            nm.fontSize = clamp_value(nm.fontSize, 8.0, 200.0)
        if nm.fontSizeRatio is not None:
            nm.fontSizeRatio = clamp_value(nm.fontSizeRatio, 0.001, 1.0)

    return mutation

