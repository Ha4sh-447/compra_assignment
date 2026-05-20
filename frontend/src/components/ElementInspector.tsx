import { useEffect, useState } from 'react';
import type { LayoutElement } from '../lib/api';
import { getRoleColor } from '../lib/colors';

interface ElementInspectorProps {
  element: LayoutElement | null;
  onClose: () => void;
}

export default function ElementInspector({ element, onClose }: ElementInspectorProps) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 1500);
    return () => window.clearTimeout(timer);
  }, [copied]);

  if (!element) {
    return (
      <div className="element-inspector-empty">
        <div className="inspector-hint">
          <span className="inspector-hint-icon">👆</span>
          <span>Click an element on the canvas to inspect its JSON data</span>
        </div>
      </div>
    );
  }

  const color = getRoleColor(element.semanticRole, element.type);
  const role = element.semanticRole || element.type;
  const content = (element.data as Record<string, string>)?.content || '';
  const fontSize = (element.style as Record<string, Record<string, number>>)?.visual?.fontSize;

  // Build a clean JSON representation of the element
  const jsonData = JSON.stringify(element, null, 2);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(jsonData);
      setCopied(true);
    } catch (err) {
      console.error('Failed to copy element JSON', err);
    }
  };

  return (
    <div className="element-inspector">
      <div className="inspector-header">
        <div className="inspector-title-row">
          <span className="inspector-dot" style={{ backgroundColor: color }} />
          <span className="inspector-role">{role}</span>
          <span className="inspector-type-badge">{element.type}</span>
          <button
            className="btn btn-secondary"
            onClick={handleCopy}
            style={{ marginLeft: 'auto', padding: '2px 8px', fontSize: '10px' }}
          >
            {copied ? 'Copied' : 'Copy JSON'}
          </button>
          <button className="inspector-close" onClick={onClose} title="Close inspector">
            ✕
          </button>
        </div>
        <div className="inspector-id">{element.id}</div>
      </div>

      <div className="inspector-props">
        <div className="inspector-section">
          <div className="inspector-section-title">Position &amp; Size</div>
          <div className="inspector-grid">
            <div className="inspector-field">
              <span className="field-label">x</span>
              <span className="field-value">{element.x.toFixed(1)}</span>
            </div>
            <div className="inspector-field">
              <span className="field-label">y</span>
              <span className="field-value">{element.y.toFixed(1)}</span>
            </div>
            <div className="inspector-field">
              <span className="field-label">w</span>
              <span className="field-value">{element.width.toFixed(1)}</span>
            </div>
            <div className="inspector-field">
              <span className="field-label">h</span>
              <span className="field-value">{element.height.toFixed(1)}</span>
            </div>
          </div>
          <div className="inspector-grid" style={{ marginTop: '6px' }}>
            <div className="inspector-field">
              <span className="field-label">nx</span>
              <span className="field-value">{element.nx?.toFixed(4) ?? '—'}</span>
            </div>
            <div className="inspector-field">
              <span className="field-label">ny</span>
              <span className="field-value">{element.ny?.toFixed(4) ?? '—'}</span>
            </div>
            <div className="inspector-field">
              <span className="field-label">nw</span>
              <span className="field-value">{element.nw?.toFixed(4) ?? '—'}</span>
            </div>
            <div className="inspector-field">
              <span className="field-label">nh</span>
              <span className="field-value">{element.nh?.toFixed(4) ?? '—'}</span>
            </div>
          </div>
        </div>

        {(content || fontSize) && (
          <div className="inspector-section">
            <div className="inspector-section-title">Content &amp; Style</div>
            {content && (
              <div className="inspector-content-preview">
                "{content.replace(/\n/g, '↵ ')}"
              </div>
            )}
            {fontSize && (
              <div className="inspector-field" style={{ marginTop: '4px' }}>
                <span className="field-label">fontSize</span>
                <span className="field-value">{fontSize}px</span>
              </div>
            )}
            {element.fontSizeRatio && (
              <div className="inspector-field" style={{ marginTop: '2px' }}>
                <span className="field-label">fontSizeRatio</span>
                <span className="field-value">{element.fontSizeRatio.toFixed(6)}</span>
              </div>
            )}
          </div>
        )}

        {element.name && (
          <div className="inspector-section">
            <div className="inspector-section-title">Metadata</div>
            <div className="inspector-field">
              <span className="field-label">name</span>
              <span className="field-value">{element.name}</span>
            </div>
            {element.groupId && (
              <div className="inspector-field" style={{ marginTop: '2px' }}>
                <span className="field-label">groupId</span>
                <span className="field-value">{element.groupId}</span>
              </div>
            )}
            {element.locked && (
              <div className="inspector-field" style={{ marginTop: '2px' }}>
                <span className="field-label">locked</span>
                <span className="field-value" style={{ color: 'var(--warning)' }}>true</span>
              </div>
            )}
          </div>
        )}

        <div className="inspector-section">
          <div className="inspector-section-title">Raw JSON</div>
          <pre className="inspector-json">{jsonData}</pre>
        </div>
      </div>
    </div>
  );
}
