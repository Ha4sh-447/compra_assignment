import type { LayoutState } from '../lib/api';

interface JsonViewerProps {
  layout: LayoutState | null;
}

export default function JsonViewer({ layout }: JsonViewerProps) {
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
      </div>
      <div className="json-viewer">
        <pre>{jsonStr}</pre>
      </div>
    </div>
  );
}
