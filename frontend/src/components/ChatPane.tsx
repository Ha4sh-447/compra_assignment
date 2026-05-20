import { useRef, useEffect, useState } from 'react';

interface Message {
  role: 'user' | 'assistant' | 'error';
  content: string;
}

interface ChatPaneProps {
  messages: Message[];
  onSend: (message: string) => void;
  onUndo: () => void;
  onRedo: () => void;
  loading: boolean;
}

export default function ChatPane({ messages, onSend, onUndo, onRedo, loading }: ChatPaneProps) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;
    onSend(input.trim());
    setInput('');
  };

  return (
    <div className="pane pane-left">
      <div className="pane-header">
        <span className="dot"></span>
        Chat
      </div>

      <div className="chat-messages">
        {messages.length === 0 && (
          <div style={{
            textAlign: 'center',
            padding: '40px 20px',
            color: 'var(--text-muted)',
            fontSize: '13px',
            lineHeight: '1.8',
          }}>
            <div style={{ fontSize: '28px', marginBottom: '12px' }}>🎨</div>
            <div style={{ fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '8px' }}>
              Layout Agent
            </div>
            <div>Try instructions like:</div>
            <div style={{ fontStyle: 'italic', color: 'var(--accent)', marginTop: '4px' }}>
              "Convert this design to 9:16"
            </div>
            <div style={{ fontStyle: 'italic', color: 'var(--accent)' }}>
              "Move the headline to the top"
            </div>
            <div style={{ fontStyle: 'italic', color: 'var(--accent)' }}>
              "Make the headline smaller"
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`chat-message ${msg.role}`}>
            <div className="label">
              {msg.role === 'user' ? 'You' : msg.role === 'error' ? 'Error' : 'Agent'}
            </div>
            {msg.content}
          </div>
        ))}

        {loading && (
          <div className="loading-dots">
            <span></span>
            <span></span>
            <span></span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input-area">
        <form onSubmit={handleSubmit}>
          <div className="chat-input-row">
            <input
              className="chat-input"
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Describe a layout change..."
              disabled={loading}
              autoFocus
            />
            <button type="submit" className="btn btn-primary" disabled={loading || !input.trim()}>
              Send
            </button>
          </div>
        </form>
        <div className="chat-actions">
          <button className="btn btn-secondary" onClick={onUndo} disabled={loading}>
            ↩ Undo
          </button>
          <button className="btn btn-secondary" onClick={onRedo} disabled={loading}>
            ↪ Redo
          </button>
        </div>
      </div>
    </div>
  );
}
