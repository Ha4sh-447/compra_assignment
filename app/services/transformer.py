from app.services.resolver import resolve_target
from app.models.commands import LayoutCommand
from app.models.layout import LayoutState


def apply_command(
        layout: LayoutState,
        command: LayoutCommand
        ):

    if command.action == "move":
        element = resolve_target(
                layout,
                command.target
                )

        if not element:
            return layout

        if command.direction == "top" or command.direction == "higher":
            element.y += command.changeValue

    elif command.action == "resize":
            element = resolve_target(
                    layout, command.target
                    )

            if not element:
                return layout

            scale = command.changeValue or 1.0

            element.width *= scale
            element.height *= scale

    elif command.action == "convert_canvas":
        if command.aspect_ratio == "9:16":
                layout.canvas_width = 1080
                layout.canvas_height = 1920

    return layout

