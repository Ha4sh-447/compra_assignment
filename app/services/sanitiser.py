"""
Input sanitisation — strips dangerous content from user input
before it reaches the LLM.
"""

import re


def sanitise_input(raw: str) -> str:
    """
    Strip HTML tags, markdown formatting, and embedded JSON/code blocks
    from user input. Returns plain text only.
    
    Prevents prompt injection via "Ignore all previous instructions..."
    embedded in HTML or markdown.
    """
    text = raw

    text = re.sub(r"<[^>]+>", "", text)

    text = re.sub(r"```[\s\S]*?```", "", text)

    text = re.sub(r"`[^`]+`", "", text)

    text = re.sub(r"^#{1,6}\s+", "", text, flags=re.MULTILINE)

    text = re.sub(r"[*_]{1,3}([^*_]+)[*_]{1,3}", r"\1", text)

    text = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", text)

    text = re.sub(r"\{[^{}]*\}", "", text)

    text = re.sub(r"\s+", " ", text).strip()

    max_length = 500
    if len(text) > max_length:
        text = text[:max_length]

    return text


def clamp_value(value: float, min_val: float, max_val: float) -> float:
    """Clamp a numeric value to [min_val, max_val]."""
    return max(min_val, min(max_val, value))
