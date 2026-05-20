import { useEffect, useState } from 'react';
import type { LayoutState } from '../lib/api';

interface JsonViewerProps {
  layout: LayoutState | null;
}

export default function JsonViewer({ layout }: JsonViewerProps) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 1500);
    return () => window.clearTimeout(timer);
  }, [copied]);

  if (!layout) {
    return (
      <div className="json-viewer-container">
        <div className="pane-header">
          <span className="dot"></span>
          JSON Output
        </div>
        <div className="json-viewer">
          <pre>Loading...</pre>
        </div>
      </div>
    );
  }

  const jsonStr = JSON.stringify(layout, null, 2);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(jsonStr);
      setCopied(true);
    } catch (err) {
      console.error('Failed to copy JSON', err);
    }
  };

  return (
    <div className="json-viewer-container">
      <div className="pane-header">
        <span className="dot"></span>
        JSON Output
        <span style={{
          marginLeft: 'auto',
          fontSize: '10px',
          color: 'var(--text-muted)',
          fontFamily: 'monospace',
        }}>
          {layout.elements.length} nodes · {layout.canvas_width}×{layout.canvas_height}
        </span>
        <button
          className="btn btn-secondary"
          onClick={handleCopy}
          style={{ marginLeft: '10px', padding: '2px 8px', fontSize: '10px' }}
        >
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <div className="json-viewer">
        <pre>{jsonStr}</pre>
      </div>
    </div>
  );
}
