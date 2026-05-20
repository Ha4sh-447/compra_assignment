# Technical Documentation (Implementation + Decisions)

## 1) System Overview
This system turns natural-language layout requests into safe, bounded JSON mutations. The backend handles the LLM call, validates the result, and applies deterministic updates before returning the new layout to the UI.

What we wanted from the system:
- Reliability over creativity: tool calls and validation prevent the layout from drifting or breaking.
- Deterministic updates: explicit mutations plus snapshots make undo/redo reliable.
- Traceability: every run is logged so you can see what the model tried to do and why.

## 2) High-Level Architecture
**Backend (FastAPI)**
- Entry point: `POST /chat` orchestrates the full pipeline.
- Supporting endpoints: `GET /layout`, `POST /undo`, `POST /redo`, `GET /traces`, `POST /traces/clear`.

**Frontend (Vite + React)**
- Chat input, live layout preview, JSON inspector, and trace viewer.
- Pulls from backend APIs and renders a scaled wireframe canvas.

System-level choice:
- The UI is intentionally thin. All mutation rules live on the backend so there is one source of truth and the same validation applies everywhere.

## 3) Backend Flow and System Rationale
### 3.1 Request Orchestration
**Flow (in order):**
1. Sanitize input text to remove prompt-injection vectors.
2. Retrieve or create session state (history + layout snapshots).
3. Annotate layout elements with semantic roles.
4. Call the LLM with a dynamic tool schema.
5. Validate tool output (ID whitelist, allowed fields, etc.).
6. Clamp/normalize numeric values to safe bounds.
7. Apply mutation to layout state.
8. Save snapshots for undo/redo.
9. Log a trace entry for observability.

**Why this pipeline (not a simpler one):**
- **Tool call + dynamic ID enum** keeps the model inside the current layout and avoids hallucinated IDs.
- **Semantic roles** match how users talk about elements, which cuts down on mis-targeted edits.
- **Short rolling history** keeps prompts lean while preserving recent intent.

### 3.2 Validation and Guardrails
Guardrails apply in three layers:
- **ID whitelist:** Mutations must target existing layout elements.
- **Allowed fields only:** The model can only set `x`, `y`, `width`, `height`, `fontSize`, `fontSizeRatio`, or normalized counterparts.
- **Clamping and normalization:** Values are clamped to reasonable bounds and normalized values are converted to absolute coordinates.

**Why not a permissive schema:**
- Tight allowlists stop the model from touching unrelated fields.
- Clamping prevents wildly large or negative values that can break the layout.

### 3.3 Mutation and Reflow Strategy
- Mutations are applied to a deep-copied layout for immutability and undo safety.
- Canvas resizing reflows all non-locked elements proportionally (including font sizes). Locked elements (e.g., background) remain unchanged unless explicitly targeted.
- Normalized coordinates are recomputed from absolute values to keep a single source of truth.

**Why this approach:**
- **Deep copy + snapshots** gives deterministic undo/redo without re-running the model.
- **Absolute coordinates as source of truth** avoids drift between normalized and absolute values.

### 3.4 Observability and Tracing
Every model call logs:
- System prompt
- Raw model response
- Validation outcome
- Latency
- Final mutation applied

Traces are stored in `data/traces.jsonl` and surfaced in the UI for rapid debugging and model tuning.

**Why not minimal logging:** When changes look valid but feel wrong, raw tool-call logs are the only practical way to debug model behavior.

## 4) Data Model
**LayoutState**
- Canvas dimensions + list of elements.

**LayoutElement**
- Core geometry (absolute + normalized)
- Type, name, parent, metadata
- Semantic role annotations, group ID, and lock flags

**Mutation Schema**
- `operation`: `resize_canvas`, `reposition`, `resize_element`, `scale_element`, `group_move`, `reorder_z`, `style_change`
- `mutations`: list of node edits by ID

**Why not a free-form patch format:** A narrow schema keeps the LLM surface area small and makes validation straightforward.

## 5) Session and Undo/Redo
- Session state is in-memory with UUID-based session IDs.
- Undo stack stores past layouts up to a fixed limit; redo stack replays recent undo operations.
- History turns are truncated to a small window to keep prompts compact.

**Why in-memory sessions:** It keeps the demo fast and simple. Persistence is an easy extension once multi-user or long-lived sessions are needed.

## 6) LLM Integration
- Uses OpenRouter via an OpenAI-compatible SDK.
- Tries a list of free models until one succeeds.
- Current model order: `openai/gpt-oss-120b`, `google/gemma-4-31b:free`, `openrouter/free`.
- Tool calls are preferred; plain text replies are treated as clarifications.

**Why this LLM strategy:**
- Free-model fallback reduces downtime when a single model is rate-limited.
- Tool-only output stays structured and easy to validate.

## 7) Frontend Implementation
### 7.1 Layout and Interaction
- Three-pane layout: chat (left), preview (center), inspector (right).
- Resizable inspector width and lower panel height for JSON/traces.
- Live preview renders SVG rectangles for elements with role-based colors.

### 7.2 Data Flow
- On load, the frontend calls `GET /layout` to bootstrap state.
- Chat sends `POST /chat`; response updates layout and messages.
- Undo/redo map to `POST /undo` and `POST /redo`.
- Traces are polled every 3 seconds for live monitoring.

**Why this UI approach:**
- Polling is simple and good enough for near-real-time updates.
- SVG scales cleanly and supports direct interaction without a heavy rendering stack.

## 8) Notable Tradeoffs and Limitations
- **State persistence:** Session storage is in-memory only; restarting the backend clears state.
- **Limited mutation scope:** Only geometry and font size are mutable by design to keep the tool safe and deterministic.
- **Prompt-driven heuristics:** Semantic roles are derived from content and naming conventions; these may need updates for new designs.

## 9) Extension Points
- Persist sessions to disk or a database for multi-user use.
- Expand semantic role matching with ML or configurable rules.
- Add true image rendering (instead of wireframe) for visual parity.
- Add streaming responses for faster UI feedback.
