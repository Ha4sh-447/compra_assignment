# Chat-Based Layout Agent

A conversational AI agent that mutates design layout JSON based on natural language instructions. Built with FastAPI + React + OpenRouter free LLMs.

## Architecture

```
User → Chat Input → Sanitiser → LLM (OpenRouter) → Validator → Transformer → Preview + JSON
```

**Key decisions:**
- **Semantic role annotation** — enriches raw node IDs (e.g., `text_1778486306230_8`) with human-readable roles (`headline`, `offer_badge`) before every LLM call, reducing hallucination
- **Three-layer guardrails** — (1) tool-use only output, (2) node ID whitelist enum, (3) field allowlist + bounds clamping
- **Immutable history** — deep-copy snapshots enable undo/redo without re-generating
- **Model fallback chain** — cycles through free OpenRouter models on rate limits

## Setup

### Prerequisites
- Python 3.12+
- Node.js 18+
- [uv](https://github.com/astral-sh/uv) (Python package manager)

### Backend

```bash
# Install dependencies
uv sync

# Set your OpenRouter API key
echo "OPENROUTER_KEY=sk-or-v1-your-key-here" > .env

# Start the server
uv run python main.py
```

The API runs at `http://localhost:8000`. Docs at `http://localhost:8000/docs`.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The UI runs at `http://localhost:5173`.

## Usage

Open the frontend and type instructions like:
- **"Convert this design to 9:16"** — resizes canvas and proportionally reflows all elements
- **"Move the headline to the top"** — repositions the headline element
- **"Make the headline smaller"** — reduces headline font size and dimensions
- **"Move the offer badge higher"** — moves the circle + text group together
- **"Keep the product large"** — scales the product image

The agent handles follow-up instructions by tracking which nodes were last mutated (anaphora resolution).

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/chat` | Main chat endpoint — processes layout instructions |
| `POST` | `/undo` | Undo the last mutation |
| `POST` | `/redo` | Redo the last undone mutation |
| `GET` | `/layout` | Get current layout state |

## Project Structure

```
compra_assignment/
├── app/
│   ├── main.py              # FastAPI app + endpoints
│   ├── data/data.json        # Source design JSON (13 nodes, 1080×1080)
│   ├── models/
│   │   ├── layout.py         # LayoutElement + LayoutState
│   │   ├── mutation.py       # LLM tool-call schema models
│   │   ├── session.py        # Session state model
│   │   └── commands.py       # AgentResponse envelope
│   ├── services/
│   │   ├── llm.py            # OpenRouter API wrapper + fallback chain
│   │   ├── annotator.py      # Semantic role annotation
│   │   ├── loader.py         # JSON → LayoutState parser
│   │   ├── transformer.py    # Mutation engine + coordinate sync
│   │   ├── validator.py      # Three-layer mutation validation
│   │   ├── sanitiser.py      # Input sanitisation
│   │   ├── session.py        # Session + undo/redo management
│   │   └── resolver.py       # Legacy keyword resolver
│   ├── prompts/system.txt    # LLM system prompt template
│   └── schemas/mutation_schema.json  # Tool-call JSON schema
├── frontend/                 # React + TypeScript UI
│   └── src/
│       ├── components/
│       │   ├── ChatPane.tsx
│       │   ├── PreviewCanvas.tsx
│       │   └── JsonViewer.tsx
│       └── lib/
│           ├── api.ts
│           └── colors.ts
├── main.py                   # Entry point (uvicorn)
└── pyproject.toml
```

## Tech Stack

- **Backend:** Python, FastAPI, Pydantic, OpenAI SDK (via OpenRouter)
- **Frontend:** React, TypeScript, Vite
- **LLM:** OpenRouter free models (gpt-oss-120b, gemma-4-31b, auto-router)
- **Preview:** SVG wireframe with semantic role colour-coding
