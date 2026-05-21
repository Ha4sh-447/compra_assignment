/**
 * API client for communicating with the layout agent backend.
 */

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000';

export interface LayoutElement {
  id: string;
  node_id: string;
  type: string;
  x: number;
  y: number;
  nx: number;
  ny: number;
  width: number;
  height: number;
  nw: number;
  nh: number;
  name?: string;
  parentId?: string;
  data?: Record<string, unknown>;
  style?: Record<string, unknown>;
  fontSizeRatio?: number;
  children?: string[];
  semanticRole?: string;
  groupId?: string;
  locked?: boolean;
}

export interface LayoutState {
  canvas_width: number;
  canvas_height: number;
  elements: LayoutElement[];
}

export interface ChatResponse {
  session_id: string;
  status: 'success' | 'clarification' | 'error';
  message: string;
  layout?: LayoutState;
  mutation?: Record<string, unknown>;
}

export async function sendChatMessage(
  message: string,
  sessionId?: string,
): Promise<ChatResponse> {
  const res = await fetch(`${API_BASE}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session_id: sessionId, message }),
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export async function undoMutation(sessionId: string): Promise<ChatResponse> {
  const res = await fetch(`${API_BASE}/undo`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session_id: sessionId, message: '' }),
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export async function redoMutation(sessionId: string): Promise<ChatResponse> {
  const res = await fetch(`${API_BASE}/redo`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session_id: sessionId, message: '' }),
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export async function getLayout(sessionId?: string): Promise<{ session_id: string; layout: LayoutState }> {
  const params = sessionId ? `?session_id=${sessionId}` : '';
  const res = await fetch(`${API_BASE}/layout${params}`);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export interface TraceItem {
  id?: string;
  timestamp: string;
  latency_ms: number;
  model: string;
  input: string;
  system_prompt: string;
  history: Array<{ role: string; content: string }>;
  raw_response?: Record<string, any>;
  validation_passed: boolean;
  validation_errors: string[];
  mutation?: Record<string, any>;
}

export async function getTraces(): Promise<TraceItem[]> {
  const res = await fetch(`${API_BASE}/traces`);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export async function clearTraces(): Promise<void> {
  const res = await fetch(`${API_BASE}/traces/clear`, { method: 'POST' });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
}
