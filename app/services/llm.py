"""
LLM service — calls OpenRouter free models via OpenAI-compatible SDK
with tool-use for structured layout mutations.
"""

import json
import os
import logging
from pathlib import Path

import openai
from openai import OpenAI
from dotenv import load_dotenv

from app.models.layout import LayoutState
from app.models.mutation import MutateLayoutCall
from app.models.commands import AgentResponse
from app.services.annotator import annotate_roles, build_element_descriptors

load_dotenv()

logger = logging.getLogger(__name__)

client = OpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=os.getenv("OPENROUTER_KEY"),
)

FREE_MODELS = [
    "openai/gpt-oss-120b",
    "google/gemma-4-31b:free",
    "openrouter/free",
]

_PROMPT_TEMPLATE = (Path(__file__).parent.parent / "prompts" / "system.txt").read_text()

_TOOL_SCHEMA_BASE = json.loads(
    (Path(__file__).parent.parent / "schemas" / "mutation_schema.json").read_text()
)


def _build_system_prompt(layout: LayoutState) -> str:
    """Render the system prompt with current layout state."""
    descriptors = build_element_descriptors(layout)

    enriched_lines = []
    for node_id, desc in descriptors.items():
        enriched_lines.append(f"  {node_id}: {desc}")
    enriched_json = "\n".join(enriched_lines)

    id_list = ", ".join(descriptors.keys())

    prompt = _PROMPT_TEMPLATE
    prompt = prompt.replace("{{ enrichedJSON }}", enriched_json)
    prompt = prompt.replace("{{ idList }}", id_list)
    prompt = prompt.replace("{{ canvasWidth }}", str(layout.canvas_width))
    prompt = prompt.replace("{{ canvasHeight }}", str(layout.canvas_height))

    return prompt


def _build_tool_definition(layout: LayoutState) -> dict:
    """Build the tool definition with dynamic node ID enum."""
    schema = json.loads(json.dumps(_TOOL_SCHEMA_BASE))

    valid_ids = [el.id for el in layout.elements]
    schema["parameters"]["properties"]["mutations"]["items"]["properties"]["node_id"]["enum"] = valid_ids

    return {
        "type": "function",
        "function": schema,
    }


def _build_messages(
    system_prompt: str,
    instruction: str,
    history: list[dict],
    last_mutated_ids: list[str],
) -> list[dict]:
    """Build the OpenAI messages array."""
    messages = [{"role": "system", "content": system_prompt}]

    for turn in history[-6:]:
        messages.append(turn)

    user_content = instruction
    if last_mutated_ids:
        context = f"[Context: the last mutated node(s) were: {', '.join(last_mutated_ids)}]\n\n"
        user_content = context + instruction

    messages.append({"role": "user", "content": user_content})

    return messages


async def call_layout_agent(
    instruction: str,
    current_layout: LayoutState,
    history: list[dict],
    last_mutated_ids: list[str],
) -> AgentResponse:
    """
    Call the LLM via OpenRouter to process a layout instruction.
    Tries each free model in order until one succeeds.
    Returns an AgentResponse with either a mutation or a clarification.
    """
    layout = annotate_roles(current_layout)

    system_prompt = _build_system_prompt(layout)
    tool_def = _build_tool_definition(layout)
    messages = _build_messages(system_prompt, instruction, history, last_mutated_ids)

    last_error = None

    for model in FREE_MODELS:
        try:
            logger.info(f"Trying model: {model}")
            response = client.chat.completions.create(
                model=model,
                messages=messages,
                tools=[tool_def],
                tool_choice="auto",
            )

            choice = response.choices[0]
            message = choice.message

            raw_resp = {}
            if message.tool_calls:
                raw_resp = {
                    "tool_calls": [
                        {
                            "name": tc.function.name,
                            "arguments": json.loads(tc.function.arguments)
                        } for tc in message.tool_calls
                    ]
                }
            elif message.content:
                raw_resp = {"content": message.content}

            if message.tool_calls and len(message.tool_calls) > 0:
                tool_call = message.tool_calls[0]
                args = json.loads(tool_call.function.arguments)

                mutation = MutateLayoutCall(**args)

                return AgentResponse(
                    status="success",
                    message=mutation.reasoning,
                    mutation=mutation,
                    model_used=model,
                    system_prompt=system_prompt,
                    raw_response=raw_resp,
                )

            if message.content:
                return AgentResponse(
                    status="clarification",
                    message=message.content,
                    model_used=model,
                    system_prompt=system_prompt,
                    raw_response=raw_resp,
                )

            return AgentResponse(
                status="error",
                message="The model returned an empty response. Please try rephrasing.",
                model_used=model,
                system_prompt=system_prompt,
                raw_response={"error": "empty_response"},
            )

        except openai.RateLimitError as e:
            logger.warning(f"Rate limited on {model}: {e}")
            last_error = e
            continue
        except openai.APIError as e:
            logger.warning(f"API error on {model}: {e}")
            last_error = e
            continue
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse tool call JSON from {model}: {e}")
            return AgentResponse(
                status="error",
                message="The model returned malformed JSON. Please try again.",
            )

    return AgentResponse(
        status="error",
        message=f"All free models are currently rate-limited. Please wait a moment and try again. Last error: {last_error}",
    )

