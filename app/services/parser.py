from app.models.commands import LayoutCommand


def parse_instruction(text: str):

    text = text.lower()

    if "headline" in text and "top" in text:

        return LayoutCommand(
            action="move",
            target="headline",
            direction="top"
        )

    if "badge" in text and "higher" in text:

        return LayoutCommand(
            action="move",
            target="badge",
            direction="higher"
        )

    if "headline" in text and "smaller" in text:

        return LayoutCommand(
            action="resize",
            target="headline",
            value=0.8
        )

    if "9:16" in text:

        return LayoutCommand(
            action="convert_canvas",
            aspect_ratio="9:16"
        )

    return LayoutCommand(
        action="unknown"
    )
