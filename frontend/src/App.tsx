import { useState, useEffect, useCallback } from 'react';
import ChatPane from './components/ChatPane';
import PreviewCanvas from './components/PreviewCanvas';
import JsonViewer from './components/JsonViewer';
import TracesViewer from './components/TracesViewer';
import { sendChatMessage, undoMutation, redoMutation, getLayout } from './lib/api';
import type { LayoutState } from './lib/api';
import './index.css';

interface Message {
  role: 'user' | 'assistant' | 'error';
  content: string;
}

export default function App() {
  const [sessionId, setSessionId] = useState<string | undefined>();
  const [layout, setLayout] = useState<LayoutState | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [mutatedIds, setMutatedIds] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'json' | 'traces'>('json');

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

      if (res.mutation) {
        const ids = (res.mutation.mutations as Array<{ node_id: string }>)?.map((m) => m.node_id) || [];
        setMutatedIds(ids);
        setTimeout(() => setMutatedIds([]), 2000);
      }

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

  return (
    <div className="app">
      <ChatPane
        messages={messages}
        onSend={handleSend}
        onUndo={handleUndo}
        onRedo={handleRedo}
        loading={loading}
      />

      <div className="pane pane-right">
        <div className="app-header">
          <h1>Layout Agent</h1>
          {sessionId && (
            <span className="session-id">session: {sessionId.slice(0, 8)}…</span>
          )}
        </div>

        <PreviewCanvas layout={layout} mutatedIds={mutatedIds} />

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
  );
}

