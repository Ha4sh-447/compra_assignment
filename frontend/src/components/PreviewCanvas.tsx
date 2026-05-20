import { useMemo } from 'react';
import type { LayoutState, LayoutElement } from '../lib/api';
import { getRoleColor } from '../lib/colors';

interface PreviewCanvasProps {
  layout: LayoutState | null;
  mutatedIds?: string[];
  selectedElementId?: string | null;
  onElementClick?: (elementId: string) => void;
}

const DISPLAY_MAX_W = 500;
const DISPLAY_MAX_H = 600;

export default function PreviewCanvas({
  layout,
  mutatedIds = [],
  selectedElementId,
  onElementClick,
}: PreviewCanvasProps) {
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

  const selectedElement = useMemo(() => {
    if (!layout || !selectedElementId) return null;
    return layout.elements.find((el) => el.id === selectedElementId) || null;
  }, [layout, selectedElementId]);

  if (!layout) {
    return (
      <div className="preview-area">
        <div style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
          Loading layout...
        </div>
      </div>
    );
  }

  /**
   * Word-wrap text into multiple lines that fit within a given pixel width.
   * Returns an array of line strings.
   */
  const wrapText = (text: string, maxWidth: number, charWidth: number): string[] => {
    if (maxWidth <= 0 || charWidth <= 0) return [];
    const maxCharsPerLine = Math.floor(maxWidth / charWidth);
    if (maxCharsPerLine <= 2) return [];

    const words = text.split(/\s+/);
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      if (testLine.length <= maxCharsPerLine) {
        currentLine = testLine;
      } else {
        if (currentLine) lines.push(currentLine);
        // If a single word exceeds the line, truncate it
        if (word.length > maxCharsPerLine) {
          currentLine = word.slice(0, maxCharsPerLine - 1) + '…';
        } else {
          currentLine = word;
        }
      }
    }
    if (currentLine) lines.push(currentLine);
    return lines;
  };

  const renderNode = (el: LayoutElement) => {
    const x = el.x * scale;
    const y = el.y * scale;
    const w = el.width * scale;
    const h = el.height * scale;
    const color = getRoleColor(el.semanticRole, el.type);
    const isMutated = mutatedIds.includes(el.id);
    const isSelected = selectedElementId === el.id;
    const fontSize = (el.style as Record<string, Record<string, number>>)?.visual?.fontSize;

    const handleClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      onElementClick?.(el.id);
    };

    if (el.type === 'shape') {
      const isCircle = (el.data as Record<string, string>)?.shapeType === 'circle';
      if (isCircle) {
        const cx = x + w / 2;
        const cy = y + h / 2;
        const rx = w / 2;
        const ry = h / 2;

        const tag = el.semanticRole || el.name || el.type;
        const labelSize = Math.max(7, Math.min(10, w / 10));

        return (
          <g key={el.id} onClick={handleClick} style={{ cursor: 'pointer' }}>
            <ellipse
              cx={cx}
              cy={cy}
              rx={rx}
              ry={ry}
              fill={color}
              fillOpacity={isSelected ? 0.4 : 0.25}
              stroke={isSelected ? '#fff' : color}
              strokeWidth={isSelected ? 2.5 : isMutated ? 2.5 : 1}
              className={isMutated ? 'node-highlight' : ''}
            />
            {w > 30 && (
              <text
                x={cx}
                y={cy}
                textAnchor="middle"
                dominantBaseline="central"
                fill={color}
                fontSize={labelSize}
                className="node-label"
              >
                {tag}
              </text>
            )}
          </g>
        );
      }
    }

    // Build label lines: tag, content text (word-wrapped to fill available space)
    const rawContent = ((el.data as Record<string, string>)?.content || '').replace(/\n/g, ' ').trim();
    const tag = el.semanticRole || el.name || el.type;
    const tagLine = fontSize ? `${tag} · ${fontSize}px` : tag;

    const tagSize = Math.max(7, Math.min(9.5, w / 14));
    const contentSize = Math.max(6.5, Math.min(9, w / 16));
    const lineHeight = contentSize + 3;

    // Calculate how many content lines we can fit
    const tagLineHeight = tagSize + 4;
    const availableHeight = h - tagLineHeight - 6; // padding
    const maxContentLines = Math.max(0, Math.floor(availableHeight / lineHeight));

    // Word-wrap the content text
    const charWidth = contentSize * 0.55;
    const usableWidth = w - 8;
    let contentLines: string[] = [];
    if (rawContent && usableWidth > 20) {
      contentLines = wrapText(rawContent, usableWidth, charWidth);
      if (contentLines.length > maxContentLines) {
        contentLines = contentLines.slice(0, maxContentLines);
        // Add ellipsis to the last visible line
        if (contentLines.length > 0) {
          const last = contentLines[contentLines.length - 1];
          const maxChars = Math.floor(usableWidth / charWidth);
          contentLines[contentLines.length - 1] = last.length > maxChars - 1
            ? last.slice(0, maxChars - 1) + '…'
            : last + '…';
        }
      }
    }

    return (
      <g key={el.id} onClick={handleClick} style={{ cursor: 'pointer' }}>
        <rect
          x={x}
          y={y}
          width={Math.max(w, 2)}
          height={Math.max(h, 2)}
          fill={color}
          fillOpacity={isSelected ? 0.35 : el.type === 'image' ? 0.15 : 0.2}
          stroke={isSelected ? '#fff' : color}
          strokeWidth={isSelected ? 2.5 : isMutated ? 2.5 : 0.8}
          strokeDasharray={el.locked ? '4 2' : 'none'}
          rx={2}
          className={`node-rect ${isMutated ? 'node-highlight' : ''}`}
        />
        {/* Tag label */}
        {w > 30 && h > 10 && (
          <text
            x={x + 4}
            y={y + tagSize + 2}
            fill={color}
            fontSize={tagSize}
            fontWeight={600}
            className="node-label"
          >
            {tagLine.length > Math.floor(usableWidth / (tagSize * 0.55))
              ? tagLine.slice(0, Math.floor(usableWidth / (tagSize * 0.55)) - 1) + '…'
              : tagLine}
          </text>
        )}
        {/* Content lines */}
        {w > 30 && contentLines.map((line, idx) => (
          <text
            key={idx}
            x={x + 4}
            y={y + tagLineHeight + 4 + idx * lineHeight}
            fill={color}
            fillOpacity={0.8}
            fontSize={contentSize}
            className="node-label"
          >
            {line}
          </text>
        ))}
      </g>
    );
  };

  const handleCanvasClick = () => {
    // Clicking empty canvas area deselects
    onElementClick?.('');
  };

  return (
    <div className="preview-area">
      <div className="canvas-container" style={{ width: displayW, height: displayH }}>
        <span className="canvas-label">
          {layout.canvas_width}×{layout.canvas_height}
        </span>
        <div
          style={{
            position: 'absolute',
            left: 8,
            bottom: 8,
            display: 'flex',
            gap: '6px',
            flexWrap: 'wrap',
          }}
        >
          <span
            style={{
              padding: '4px 8px',
              borderRadius: '999px',
              background: 'rgba(0, 0, 0, 0.45)',
              color: 'var(--text-secondary)',
              fontSize: '10px',
              border: '1px solid var(--border)',
            }}
          >
            {selectedElement
              ? `Selected: ${selectedElement.semanticRole || selectedElement.name || selectedElement.type}`
              : 'Selected: none'}
          </span>
          <span
            style={{
              padding: '4px 8px',
              borderRadius: '999px',
              background: 'rgba(0, 0, 0, 0.45)',
              color: 'var(--text-secondary)',
              fontSize: '10px',
              border: '1px solid var(--border)',
            }}
          >
            Mutated: {mutatedIds.length}
          </span>
        </div>
        <svg
          width={displayW}
          height={displayH}
          viewBox={`0 0 ${displayW} ${displayH}`}
          onClick={handleCanvasClick}
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
