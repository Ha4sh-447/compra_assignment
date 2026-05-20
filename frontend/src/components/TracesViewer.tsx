import { useState, useEffect, useRef, useCallback } from 'react';
import { getTraces, clearTraces } from '../lib/api';
import type { TraceItem } from '../lib/api';

export default function TracesViewer() {
  const [traces, setTraces] = useState<TraceItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedIdRef = useRef<string | null>(null);

  // Keep the ref in sync so the polling callback always has the latest value
  useEffect(() => {
    selectedIdRef.current = selectedId;
  }, [selectedId]);

  const loadTraces = useCallback(async () => {
    try {
      const data = await getTraces();
      setTraces(data);
      // Only auto-select the first trace when nothing is selected yet
      if (data.length > 0 && selectedIdRef.current === null) {
        const firstId = data[0].id || 'fallback-0';
        setSelectedId(firstId);
      }
    } catch (err) {
      console.error('Failed to load traces', err);
    }
  }, []);

  useEffect(() => {
    loadTraces();
    const interval = setInterval(loadTraces, 3000);
    return () => clearInterval(interval);
  }, [loadTraces]);

  const handleClear = async () => {
    if (!window.confirm('Are you sure you want to clear trace history?')) return;
    try {
      await clearTraces();
      setTraces([]);
      setSelectedId(null);
    } catch (err) {
      console.error(err);
    }
  };

  const selected = selectedId !== null ? traces.find(t => (t.id || 'fallback-0') === selectedId) : null;

  return (
    <div className="json-viewer-container" style={{ height: '360px' }}>
      <div className="pane-header">
        <span className="dot" style={{ backgroundColor: 'var(--success)' }}></span>
        Agent Traces (LangSmith Local Log)
        <button
          className="btn btn-secondary"
          onClick={loadTraces}
          style={{ marginLeft: 'auto', padding: '2px 8px', fontSize: '10px' }}
        >
          🔄 Refresh
        </button>
        <button
          className="btn btn-secondary"
          onClick={handleClear}
          style={{ marginLeft: '6px', padding: '2px 8px', fontSize: '10px', color: 'var(--error)' }}
          disabled={traces.length === 0}
        >
          🗑️ Clear
        </button>
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', background: 'var(--bg-secondary)' }}>
        <div style={{
          width: '320px',
          borderRight: '1px solid var(--border)',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          scrollbarWidth: 'thin',
        }}>
          {traces.length === 0 ? (
            <div style={{ padding: '20px', color: 'var(--text-muted)', fontSize: '12px', textAlign: 'center' }}>
              No agent runs captured yet.<br />Send a message to see raw LLM traces here!
            </div>
          ) : (
            traces.map((t, idx) => {
              const date = new Date(t.timestamp);
              const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
              const traceId = t.id || `fallback-${idx}`;
              const isSelected = selectedId === traceId;
              const hasToolCall = !!t.raw_response?.tool_calls;

              return (
                <div
                  key={traceId}
                  onClick={() => setSelectedId(traceId)}
                  style={{
                    padding: '10px 12px',
                    borderBottom: '1px solid var(--border)',
                    cursor: 'pointer',
                    background: isSelected ? 'var(--bg-tertiary)' : 'transparent',
                    borderLeft: isSelected ? '3px solid var(--accent)' : '3px solid transparent',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <span style={{
                      fontSize: '10px',
                      fontWeight: 600,
                      color: t.validation_passed ? 'var(--success)' : 'var(--error)',
                      textTransform: 'uppercase',
                    }}>
                      {t.validation_passed ? 'Success' : 'Failed'}
                    </span>
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                      {timeStr} · {t.latency_ms}ms
                    </span>
                  </div>
                  <div style={{
                    fontSize: '11px',
                    fontWeight: 500,
                    color: 'var(--text-primary)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}>
                    {t.input}
                  </div>
                  <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                    <span style={{
                      fontSize: '8px',
                      padding: '2px 4px',
                      background: 'var(--bg-elevated)',
                      color: 'var(--text-secondary)',
                      borderRadius: '3px',
                      fontFamily: 'monospace',
                    }}>
                      {t.model.split('/').pop()}
                    </span>
                    <span style={{
                      fontSize: '8px',
                      padding: '2px 4px',
                      background: hasToolCall ? 'rgba(108, 92, 231, 0.15)' : 'rgba(52, 152, 219, 0.15)',
                      color: hasToolCall ? 'var(--accent)' : 'var(--info)',
                      borderRadius: '3px',
                      fontWeight: 600,
                    }}>
                      {hasToolCall ? '🛠️ Tool Use' : '💬 Chat'}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', scrollbarWidth: 'thin' }}>
          {selected ? (
            <>
              <div style={{
                background: 'var(--bg-tertiary)',
                borderRadius: 'var(--radius-sm)',
                padding: '12px',
                border: '1px solid var(--border)',
              }}>
                <table style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse', color: 'var(--text-secondary)' }}>
                  <tbody>
                    <tr>
                      <td style={{ padding: '4px 0', fontWeight: 600, width: '120px' }}>OpenRouter Model:</td>
                      <td style={{ padding: '4px 0', fontFamily: 'monospace', color: 'var(--text-primary)' }}>{selected.model}</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '4px 0', fontWeight: 600 }}>Latency:</td>
                      <td style={{ padding: '4px 0', color: 'var(--warning)' }}>{selected.latency_ms} ms</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '4px 0', fontWeight: 600 }}>Timestamp:</td>
                      <td style={{ padding: '4px 0' }}>{new Date(selected.timestamp).toLocaleString()}</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '4px 0', fontWeight: 600 }}>Validation:</td>
                      <td style={{
                        padding: '4px 0',
                        color: selected.validation_passed ? 'var(--success)' : 'var(--error)',
                        fontWeight: 600,
                      }}>
                        {selected.validation_passed ? 'PASSED' : 'FAILED'}
                      </td>
                    </tr>
                    {selected.validation_errors.length > 0 && (
                      <tr>
                        <td style={{ padding: '4px 0', fontWeight: 600, color: 'var(--error)' }}>Errors:</td>
                        <td style={{ padding: '4px 0', color: 'var(--error)' }}>
                          {selected.validation_errors.join('; ')}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <TraceDetailsCard key={`input-${selectedId}`} title="Input Message" value={selected.input} />

              <TraceDetailsCard
                key={`sysprompt-${selectedId}`}
                title="System Prompt Sent to LLM (Dynamic Enriched Context)"
                value={selected.system_prompt}
                codeFormat
              />

              <TraceDetailsCard
                key={`rawresp-${selectedId}`}
                title="Raw Model Response (Arguments to mutate_layout)"
                value={JSON.stringify(selected.raw_response || {}, null, 2)}
                codeFormat
              />

              {selected.mutation && (
                <TraceDetailsCard
                  key={`mutation-${selectedId}`}
                  title="Final Clamped & Resolved Mutation Applied"
                  value={JSON.stringify(selected.mutation, null, 2)}
                  codeFormat
                />
              )}
            </>
          ) : (
            <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
              Select a trace from the left panel to inspect execution details.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface TraceDetailsCardProps {
  title: string;
  value: string;
  codeFormat?: boolean;
}

function TraceDetailsCard({ title, value, codeFormat = false }: TraceDetailsCardProps) {
  const [collapsed, setCollapsed] = useState(true);

  if (!value) return null;

  return (
    <div style={{
      background: 'var(--bg-tertiary)',
      borderRadius: 'var(--radius-sm)',
      border: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
    }}>
      <div
        onClick={() => setCollapsed(!collapsed)}
        style={{
          padding: '8px 12px',
          borderBottom: collapsed ? 'none' : '1px solid var(--border)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '11px',
          fontWeight: 600,
          color: 'var(--text-primary)',
          userSelect: 'none',
        }}
      >
        <span>{title}</span>
        <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
          {collapsed ? '▶ Expand' : '▼ Collapse'}
        </span>
      </div>

      {!collapsed && (
        <div style={{
          padding: '12px',
          maxHeight: '300px',
          overflowY: 'auto',
          fontSize: '11px',
          lineHeight: '1.6',
          whiteSpace: 'pre-wrap',
          background: 'rgba(0, 0, 0, 0.2)',
          color: 'var(--text-secondary)',
          fontFamily: codeFormat ? 'JetBrains Mono, Fira Code, monospace' : 'inherit',
        }}>
          {value}
        </div>
      )}
    </div>
  );
}

