from app.models.commands import LayoutCommand
from app.models.layout import LayoutElement, LayoutState
ROLE_KEYWORDS = {
    "headline": [
        "headline",
        "title",
        "heading"
    ],

    "product": [
        "product",
        "shoe",
        "bottle",
        "item"
    ],

    "badge": [
        "badge",
        "offer",
        "discount"
    ]
}


def resolve_target(
        layout: LayoutState,
        target: str
        ) -> LayoutElement | None:
    
    target = target.lower()

    keywords = ROLE_KEYWORDS.get(target, [target])

    for element in layout.elements:
        name = (element.name or "").lower()

        for keyword in keywords:
            if keyword in name:
                return element

    return None

# def resolver(layout:LayoutState, target: str) -> LayoutCommand:
    