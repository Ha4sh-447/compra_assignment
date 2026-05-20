"""
Tracing service — captures LLM inputs, system prompts, raw tool calls,
latencies, and validation logs to enable LangSmith-like local monitoring.
"""

import json
import time
from datetime import datetime
from pathlib import Path
from typing import Optional, Any
from pydantic import BaseModel

TRACES_FILE = Path(__file__).parent.parent / "data" / "traces.jsonl"


class TraceItem(BaseModel):
    timestamp: str
    latency_ms: float
    model: str
    input: str
    system_prompt: str
    history: list[dict]
    raw_response: Optional[dict] = None
    validation_passed: bool
    validation_errors: list[str]
    mutation: Optional[dict] = None


_in_memory_traces: list[dict] = []
MAX_IN_MEMORY = 50


def add_trace(
    latency_ms: float,
    model: str,
    user_input: str,
    system_prompt: str,
    history: list[dict],
    raw_response: Optional[dict],
    validation_passed: bool,
    validation_errors: list[str],
    mutation: Optional[dict] = None,
) -> None:
    """Record a trace item to local traces.jsonl and in-memory log."""
    trace = TraceItem(
        timestamp=datetime.now().isoformat(),
        latency_ms=round(latency_ms, 2),
        model=model,
        input=user_input,
        system_prompt=system_prompt,
        history=history,
        raw_response=raw_response,
        validation_passed=validation_passed,
        validation_errors=validation_errors,
        mutation=mutation,
    )

    trace_dict = trace.model_dump()

    _in_memory_traces.insert(0, trace_dict)
    if len(_in_memory_traces) > MAX_IN_MEMORY:
        _in_memory_traces.pop()

    try:
        TRACES_FILE.parent.mkdir(parents=True, exist_ok=True)
        with open(TRACES_FILE, "a", encoding="utf-8") as f:
            f.write(json.dumps(trace_dict) + "\n")
    except Exception as e:
        print(f"Failed to write trace to file: {e}")


def get_traces() -> list[dict]:
    """Retrieve all logged traces (newest first)."""
    global _in_memory_traces
    if not _in_memory_traces and TRACES_FILE.exists():
        try:
            with open(TRACES_FILE, "r", encoding="utf-8") as f:
                lines = f.readlines()
                parsed = []
                for line in lines[-MAX_IN_MEMORY:]:
                    if line.strip():
                        parsed.append(json.loads(line))
                _in_memory_traces = list(reversed(parsed))
        except Exception:
            pass

    return _in_memory_traces


def clear_traces() -> None:
    """Clear all traces."""
    global _in_memory_traces
    _in_memory_traces.clear()
    if TRACES_FILE.exists():
        try:
            TRACES_FILE.unlink()
        except Exception:
            pass

