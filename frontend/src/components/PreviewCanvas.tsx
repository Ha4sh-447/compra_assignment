import { useMemo } from 'react';
import type { LayoutState, LayoutElement } from '../lib/api';
import { getRoleColor } from '../lib/colors';

interface PreviewCanvasProps {
  layout: LayoutState | null;
  mutatedIds?: string[];
}

const DISPLAY_MAX_W = 500;
const DISPLAY_MAX_H = 600;

export default function PreviewCanvas({ layout, mutatedIds = [] }: PreviewCanvasProps) {
  const { scale, displayW, displayH, elements } = useMemo(() => {
    if (!layout) return { scale: 1, displayW: 400, displayH: 400, elements: [] };

    const cw = layout.canvas_width;
    const ch = layout.canvas_height;
    const scaleW = DISPLAY_MAX_W / cw;
    const scaleH = DISPLAY_MAX_H / ch;
    const s = Math.min(scaleW, scaleH, 1);

    return {
      scale: s,
      displayW: cw * s,
      displayH: ch * s,
      elements: layout.elements.filter((el) => el.type !== 'artboard'),
    };
  }, [layout]);

  if (!layout) {
    return (
      <div className="preview-area">
        <div style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
          Loading layout...
        </div>
      </div>
    );
  }

  const renderNode = (el: LayoutElement) => {
    const x = el.x * scale;
    const y = el.y * scale;
    const w = el.width * scale;
    const h = el.height * scale;
    const color = getRoleColor(el.semanticRole, el.type);
    const isMutated = mutatedIds.includes(el.id);
    const fontSize = (el.style as Record<string, Record<string, number>>)?.visual?.fontSize;

    if (el.type === 'shape') {
      const isCircle = (el.data as Record<string, string>)?.shapeType === 'circle';
      if (isCircle) {
        const cx = x + w / 2;
        const cy = y + h / 2;
        const rx = w / 2;
        const ry = h / 2;
        return (
          <g key={el.id}>
            <ellipse
              cx={cx}
              cy={cy}
              rx={rx}
              ry={ry}
              fill={color}
              fillOpacity={0.25}
              stroke={color}
              strokeWidth={isMutated ? 2.5 : 1}
              className={isMutated ? 'node-highlight' : ''}
            />
            <text
              x={cx}
              y={cy}
              textAnchor="middle"
              dominantBaseline="central"
              fill={color}
              fontSize={Math.max(8, Math.min(11, w / 8))}
              className="node-label"
            >
              {el.semanticRole || el.name || el.type}
            </text>
          </g>
        );
      }
    }

    return (
      <g key={el.id}>
        <rect
          x={x}
          y={y}
          width={Math.max(w, 2)}
          height={Math.max(h, 2)}
          fill={color}
          fillOpacity={el.type === 'image' ? 0.15 : 0.2}
          stroke={color}
          strokeWidth={isMutated ? 2.5 : 0.8}
          strokeDasharray={el.locked ? '4 2' : 'none'}
          rx={2}
          className={`node-rect ${isMutated ? 'node-highlight' : ''}`}
        />
        {w > 30 && h > 12 && (
          <text
            x={x + 4}
            y={y + Math.min(14, h - 2)}
            fill={color}
            fontSize={Math.max(7, Math.min(10, w / 12))}
            className="node-label"
          >
            {el.semanticRole || el.name || el.type}
            {fontSize ? ` (${fontSize}px)` : ''}
          </text>
        )}
        {el.type === 'text' && w > 50 && h > 24 && (
          <text
            x={x + 4}
            y={y + Math.min(26, h - 2)}
            fill={color}
            fillOpacity={0.6}
            fontSize={Math.max(6, Math.min(9, w / 16))}
            className="node-label"
          >
            {((el.data as Record<string, string>)?.content || '').replace(/\n/g, ' ').slice(0, 30)}
          </text>
        )}
      </g>
    );
  };

  return (
    <div className="preview-area">
      <div className="canvas-container" style={{ width: displayW, height: displayH }}>
        <span className="canvas-label">
          {layout.canvas_width}×{layout.canvas_height}
        </span>
        <svg
          width={displayW}
          height={displayH}
          viewBox={`0 0 ${displayW} ${displayH}`}
        >
          <rect
            width={displayW}
            height={displayH}
            fill="#1a1a28"
            rx={2}
          />
          {elements.map(renderNode)}
        </svg>
      </div>
    </div>
  );
}

