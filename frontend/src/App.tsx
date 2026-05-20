import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import ChatPane from './components/ChatPane';
import PreviewCanvas from './components/PreviewCanvas';
import JsonViewer from './components/JsonViewer';
import TracesViewer from './components/TracesViewer';
import ElementInspector from './components/ElementInspector';
import { sendChatMessage, undoMutation, redoMutation, getLayout } from './lib/api';
import type { LayoutState } from './lib/api';
import './index.css';

interface Message {
  role: 'user' | 'assistant' | 'error';
  content: string;
}

export default function App() {
  const appRef = useRef<HTMLDivElement>(null);
  const centerRef = useRef<HTMLDivElement>(null);
  const [sessionId, setSessionId] = useState<string | undefined>();
  const [layout, setLayout] = useState<LayoutState | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'json' | 'traces'>('json');
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [inspectorWidth, setInspectorWidth] = useState(300);
  const [lowerPanelHeight, setLowerPanelHeight] = useState(320);

  useEffect(() => {
    getLayout().then((data) => {
      setSessionId(data.session_id);
      setLayout(data.layout);
    }).catch(console.error);
  }, []);

  const handleSend = useCallback(async (message: string) => {
    setLoading(true);
    setMessages((prev) => [...prev, { role: 'user', content: message }]);

    try {
      const res = await sendChatMessage(message, sessionId);
      setSessionId(res.session_id);

      if (res.layout) setLayout(res.layout);

      setMessages((prev) => [
        ...prev,
        {
          role: res.status === 'error' ? 'error' : 'assistant',
          content: res.message,
        },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: 'error', content: `Request failed: ${err}` },
      ]);
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  const handleUndo = useCallback(async () => {
    if (!sessionId) return;
    setLoading(true);
    try {
      const res = await undoMutation(sessionId);
      if (res.layout) setLayout(res.layout);
      setMessages((prev) => [...prev, { role: 'assistant', content: res.message }]);
    } catch (err) {
      setMessages((prev) => [...prev, { role: 'error', content: `Undo failed: ${err}` }]);
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  const handleRedo = useCallback(async () => {
    if (!sessionId) return;
    setLoading(true);
    try {
      const res = await redoMutation(sessionId);
      if (res.layout) setLayout(res.layout);
      setMessages((prev) => [...prev, { role: 'assistant', content: res.message }]);
    } catch (err) {
      setMessages((prev) => [...prev, { role: 'error', content: `Redo failed: ${err}` }]);
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  const handleElementClick = useCallback((elementId: string) => {
    setSelectedElementId(elementId || null);
  }, []);

  const selectedElement = useMemo(() => {
    if (!layout || !selectedElementId) return null;
    return layout.elements.find((el) => el.id === selectedElementId) || null;
  }, [layout, selectedElementId]);

  const handleInspectorResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = inspectorWidth;

    const onMove = (event: MouseEvent) => {
      const containerWidth = appRef.current?.getBoundingClientRect().width || window.innerWidth;
      const delta = startX - event.clientX;
      const minWidth = 240;
      const maxWidth = Math.min(520, Math.floor(containerWidth * 0.45));
      const nextWidth = Math.max(minWidth, Math.min(maxWidth, startWidth + delta));
      setInspectorWidth(nextWidth);
    };

    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [inspectorWidth]);

  const handleLowerPanelResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const startY = e.clientY;
    const startHeight = lowerPanelHeight;

    const onMove = (event: MouseEvent) => {
      const centerBounds = centerRef.current?.getBoundingClientRect();
      const containerHeight = centerBounds?.height || window.innerHeight;
      const delta = startY - event.clientY;
      const minHeight = 180;
      const maxHeight = Math.max(minHeight, containerHeight - 200);
      const nextHeight = Math.max(minHeight, Math.min(maxHeight, startHeight + delta));
      setLowerPanelHeight(nextHeight);
    };

    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [lowerPanelHeight]);

  return (
    <div className="app" ref={appRef}>
      <ChatPane
        messages={messages}
        onSend={handleSend}
        onUndo={handleUndo}
        onRedo={handleRedo}
        loading={loading}
      />

      <div className="pane pane-center" ref={centerRef}>
        <div className="app-header">
          <h1>Layout Agent</h1>
          {sessionId && (
            <span className="session-id">session: {sessionId.slice(0, 8)}…</span>
          )}
        </div>

        <div className="preview-region">
          <PreviewCanvas
            layout={layout}
            selectedElementId={selectedElementId}
            onElementClick={handleElementClick}
          />
        </div>

        <div className="resizer-horizontal" onMouseDown={handleLowerPanelResizeStart} />

        <div className="lower-panel" style={{ height: lowerPanelHeight }}>
          <div className="tab-bar">
            <div
              className={`tab ${activeTab === 'json' ? 'active' : ''}`}
              onClick={() => setActiveTab('json')}
            >
              📋 JSON Viewer
            </div>
            <div
              className={`tab ${activeTab === 'traces' ? 'active' : ''}`}
              onClick={() => setActiveTab('traces')}
            >
              🔍 Agent Traces (LangSmith)
            </div>
          </div>

          {activeTab === 'json' ? (
            <JsonViewer layout={layout} />
          ) : (
            <TracesViewer />
          )}
        </div>
      </div>

      <div className="resizer-vertical" onMouseDown={handleInspectorResizeStart} />

      <div className="pane pane-inspector" style={{ width: inspectorWidth }}>
        <div className="pane-header">
          <span className="dot" style={{ backgroundColor: 'var(--info)' }} />
          Element Inspector
        </div>
        <ElementInspector
          element={selectedElement}
          onClose={() => setSelectedElementId(null)}
        />
      </div>
    </div>
  );
}
