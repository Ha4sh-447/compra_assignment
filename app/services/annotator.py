"""
Semantic role annotation — enriches LayoutState elements with
human-readable roles, group IDs, and lock flags before LLM calls.
"""

from app.models.layout import LayoutState


def _match_headline(el) -> bool:
    content = (el.data or {}).get("content", "")
    return el.type == "text" and "luxury" in content.lower()


def _match_subheadline(el) -> bool:
    content = (el.data or {}).get("content", "")
    return el.type == "text" and "comfort that defines" in content.lower()


def _match_offer_text(el) -> bool:
    content = (el.data or {}).get("content", "")
    return el.type == "text" and "limited time offer" in content.lower()


def _match_social_proof(el) -> bool:
    content = (el.data or {}).get("content", "")
    return el.type == "text" and "happy homes" in content.lower()


def _match_offer_badge_text(el) -> bool:
    content = (el.data or {}).get("content", "")
    return el.type == "text" and "off" in content.lower() and "%" in content


def _match_offer_badge_circle(el) -> bool:
    return el.type == "shape" and (el.data or {}).get("shapeType") == "circle"


def _match_product_image(el) -> bool:
    return el.type == "image" and "product" in (el.name or "").lower()


def _match_background(el) -> bool:
    return el.type == "image" and "background" in (el.name or "").lower()


def _match_rating_icon(el) -> bool:
    return el.type == "image" and "vector" in (el.name or "").lower()


def _match_artboard(el) -> bool:
    return el.type == "artboard"


_ROLE_RULES = [
    (_match_artboard,           "artboard",       None,                  False),
    (_match_background,         "background",     None,                  True),
    (_match_headline,           "headline",       None,                  False),
    (_match_subheadline,        "subheadline",    None,                  False),
    (_match_offer_text,         "offer_text",     None,                  False),
    (_match_social_proof,       "social_proof",   None,                  False),
    (_match_offer_badge_text,   "offer_badge",    "offer_badge_group",   False),
    (_match_offer_badge_circle, "offer_badge",    "offer_badge_group",   False),
    (_match_product_image,      "product_image",  None,                  False),
    (_match_rating_icon,        "rating_icon",    "rating_icons_group",  False),
]


def annotate_roles(layout: LayoutState) -> LayoutState:
    """
    Annotate each element with semanticRole, groupId, and locked flag.
    Runs before every LLM call so the model reasons over clean vocabulary
    instead of opaque IDs like 'text_1778486306230_8'.
    """
    for element in layout.elements:
        for match_fn, role, group_id, locked in _ROLE_RULES:
            if match_fn(element):
                element.semanticRole = role
                element.groupId = group_id
                element.locked = locked
                break
        else:
            element.semanticRole = element.type
            element.groupId = None
            element.locked = False

    return layout


def build_element_descriptors(layout: LayoutState) -> dict[str, str]:
    """
    Build a node_id → human-readable descriptor map for the LLM system prompt.
    Example: "text_1778486306230_8" → "headline: 'Luxury Comfort, Surprisingly Attainable' (text, 72px)"
    """
    descriptors: dict[str, str] = {}
    for el in layout.elements:
        parts = [el.semanticRole or el.type]

        content = (el.data or {}).get("content", "")
        if content:
            short = content.replace("\n", " ").strip()[:50]
            parts.append(f"'{short}'")

        if el.name and el.name != "Text":
            parts.append(f"name={el.name}")

        font_size = (el.style or {}).get("visual", {}).get("fontSize")
        if font_size:
            parts.append(f"{font_size}px")

        parts.append(f"at ({el.x:.0f},{el.y:.0f}) size {el.width:.0f}×{el.height:.0f}")

        if el.groupId:
            parts.append(f"group={el.groupId}")
        if el.locked:
            parts.append("LOCKED")

        descriptors[el.id] = " | ".join(parts)

    return descriptors

