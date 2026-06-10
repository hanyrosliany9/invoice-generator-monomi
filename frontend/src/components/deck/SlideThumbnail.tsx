import React from 'react';
import { safeUrl } from '@/utils/safeUrl';
import type { DeckSlide } from '@/types/deck';

interface SlideThumbnailProps {
  slide: DeckSlide;
  /** Width in px of the thumbnail container */
  width: number;
  /** Height in px of the thumbnail container */
  height: number;
  /** The full (logical) deck width — used to compute the scale factor */
  deckWidth: number;
  /** The full (logical) deck height — used to compute the scale factor */
  deckHeight: number;
}

/**
 * Renders a miniature representation of a slide by mirroring the
 * PresentSlideRenderer pattern: each element's percent-based x/y/width/height
 * is mapped directly into the thumbnail box (CSS absolute positioning with
 * `left/top/width/height` expressed as percentages, so the browser scales
 * them for us). Text, images, and shapes are rendered with simplified styling
 * — no Fabric canvas, no heavy dependencies.
 */
const SlideThumbnail: React.FC<SlideThumbnailProps> = ({
  slide,
  width,
  height,
  deckWidth,
  deckHeight,
}) => {
  const {
    backgroundColor,
    backgroundImage,
    elements = [],
    title,
    subtitle,
  } = slide;

  // Scale factor for font sizes relative to the full deck dimensions
  const scaleX = width / deckWidth;
  const scaleY = height / deckHeight;
  const scale = Math.min(scaleX, scaleY);

  const hasElements = elements.length > 0;

  return (
    <div
      style={{
        width,
        height,
        background: backgroundColor || '#ffffff',
        position: 'relative',
        overflow: 'hidden',
        flexShrink: 0,
      }}
    >
      {/* Background image */}
      {safeUrl(backgroundImage) && (
        <img
          src={safeUrl(backgroundImage)}
          alt=""
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            pointerEvents: 'none',
          }}
          aria-hidden="true"
        />
      )}

      {/* Free-form elements */}
      {elements
        .slice()
        .sort((a, b) => a.zIndex - b.zIndex)
        .map((el) => {
          const c = el.content ?? {};
          return (
            <div
              key={el.id}
              style={{
                position: 'absolute',
                left: `${el.x}%`,
                top: `${el.y}%`,
                width: `${el.width}%`,
                height: `${el.height}%`,
                transform: el.rotation ? `rotate(${el.rotation}deg)` : undefined,
                transformOrigin: 'top left',
                zIndex: el.zIndex,
                pointerEvents: 'none',
                overflow: 'hidden',
              }}
            >
              {el.type === 'TEXT' && c.text && (
                <span
                  style={{
                    display: 'block',
                    fontSize: c.fontSize ? `${(c.fontSize as number) * scale}px` : `${12 * scale}px`,
                    fontFamily: (c.fontFamily as string) || 'Inter, sans-serif',
                    fontWeight: c.fontWeight as React.CSSProperties['fontWeight'],
                    fontStyle: c.fontStyle as React.CSSProperties['fontStyle'],
                    color: (c.fill as string) || (c.color as string) || '#000000',
                    textAlign: c.textAlign as React.CSSProperties['textAlign'],
                    whiteSpace: 'pre-wrap',
                    overflow: 'hidden',
                    lineHeight: 1.2,
                  }}
                >
                  {c.text as string}
                </span>
              )}

              {(el.type === 'IMAGE' || el.type === 'VIDEO') && safeUrl(c.url) && (
                <img
                  src={safeUrl(c.url as string)}
                  alt={(c.alt as string) ?? ''}
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                />
              )}

              {el.type === 'SHAPE' && (
                <ThumbnailShape content={c} />
              )}

              {el.type === 'ICON' && c.svg && (
                <ThumbnailIcon svg={c.svg as string} color={c.color as string | undefined} />
              )}

              {el.type === 'TABLE' && (
                <ThumbnailTable content={c} scale={scale} />
              )}

              {el.type === 'CHART' && (
                <ThumbnailChart content={c} />
              )}
            </div>
          );
        })}

      {/* Fallback: show title text when no elements are present */}
      {!hasElements && (title || subtitle) && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '4px',
            pointerEvents: 'none',
          }}
        >
          {title && (
            <span
              style={{
                fontSize: `${10 * scale}px`,
                fontFamily: 'Inter, sans-serif',
                fontWeight: 600,
                color: '#111827',
                textAlign: 'center',
                overflow: 'hidden',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
              }}
            >
              {title}
            </span>
          )}
          {subtitle && (
            <span
              style={{
                fontSize: `${8 * scale}px`,
                fontFamily: 'Inter, sans-serif',
                color: '#6b7280',
                textAlign: 'center',
                marginTop: 2,
                overflow: 'hidden',
                whiteSpace: 'nowrap',
                textOverflow: 'ellipsis',
                maxWidth: '100%',
              }}
            >
              {subtitle}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

// ── Thumbnail ICON ────────────────────────────────────────────────────────────

function ThumbnailIcon({ svg, color }: { svg: string; color?: string }) {
  const dataUri = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  return (
    <img
      src={dataUri}
      alt=""
      aria-hidden="true"
      style={{
        width: '100%',
        height: '100%',
        objectFit: 'contain',
        filter: color ? buildThumbColorFilter(color) : undefined,
      }}
    />
  );
}

// ── Thumbnail TABLE ───────────────────────────────────────────────────────────

function ThumbnailTable({ content, scale }: { content: Record<string, any>; scale: number }) {
  const cells: string[][] = Array.isArray(content.cells) ? content.cells : [];
  const headerRow: boolean = content.headerRow ?? false;
  const borderColor: string = (content.borderColor as string) || '#cccccc';
  const headerBg: string = (content.headerBg as string) || '#374151';
  const textColor: string = (content.textColor as string) || '#000000';
  const fontSize: number = ((content.fontSize as number) || 14) * scale;

  if (cells.length === 0) {
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          border: `1px solid ${borderColor}`,
          boxSizing: 'border-box',
          background: '#f9fafb',
        }}
      />
    );
  }

  // In the thumbnail we just render the first few rows to keep it light
  const visibleRows = cells.slice(0, 6);

  return (
    <div style={{ width: '100%', height: '100%', overflow: 'hidden', boxSizing: 'border-box' }}>
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          tableLayout: 'fixed',
          fontSize: `${Math.max(fontSize, 4)}px`,
          color: textColor,
        }}
      >
        <tbody>
          {visibleRows.map((row, rIdx) => {
            const isHeader = headerRow && rIdx === 0;
            return (
              <tr key={rIdx}>
                {(Array.isArray(row) ? row : []).map((cell, cIdx) => (
                  <td
                    key={cIdx}
                    style={{
                      border: `1px solid ${borderColor}`,
                      padding: '1px 2px',
                      backgroundColor: isHeader ? headerBg : undefined,
                      color: isHeader ? '#ffffff' : textColor,
                      fontWeight: isHeader ? 600 : 400,
                      overflow: 'hidden',
                      whiteSpace: 'nowrap',
                      textOverflow: 'ellipsis',
                      verticalAlign: 'middle',
                      lineHeight: 1.1,
                    }}
                  >
                    {cell ?? ''}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Thumbnail CHART ───────────────────────────────────────────────────────────

/**
 * Simplified chart thumbnail — bars/slices only, no labels/legend text.
 * Uses a fixed 100×60 viewBox scaled to fill the element box.
 */
function ThumbnailChart({ content }: { content: Record<string, any> }) {
  const chartType: string = (content.chartType as string) || 'bar';
  const series: Array<{ name: string; color: string; values: number[] }> =
    Array.isArray(content.series) ? content.series : [];

  const VW = 100;
  const VH = 60;

  const allValues = series.flatMap((s) => s.values ?? []);
  const maxVal = allValues.length > 0 ? Math.max(...allValues, 0.001) : 1;

  if (series.length === 0) {
    return (
      <svg viewBox={`0 0 ${VW} ${VH}`} style={{ width: '100%', height: '100%' }}>
        <rect x={0} y={0} width={VW} height={VH} fill="#f3f4f6" />
        <text x={VW / 2} y={VH / 2 + 4} textAnchor="middle" fontSize={8} fill="#9ca3af">Chart</text>
      </svg>
    );
  }

  const numCats = Math.max(...series.map((s) => s.values?.length ?? 0));

  if (chartType === 'pie') {
    const vals = series[0]?.values ?? [];
    const total = vals.reduce((a, b) => a + b, 0);
    const cx = VW / 2;
    const cy = VH / 2;
    const r = Math.min(VW, VH) / 2 - 4;
    const slices: React.ReactElement[] = [];
    let startAngle = -Math.PI / 2;
    vals.forEach((v, i) => {
      const sweep = total > 0 ? (v / total) * 2 * Math.PI : 0;
      const endAngle = startAngle + sweep;
      const x1 = cx + r * Math.cos(startAngle);
      const y1 = cy + r * Math.sin(startAngle);
      const x2 = cx + r * Math.cos(endAngle);
      const y2 = cy + r * Math.sin(endAngle);
      const largeArc = sweep > Math.PI ? 1 : 0;
      const color = series[i]?.color || series[0]?.color || '#6366f1';
      const d = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;
      slices.push(<path key={i} d={d} fill={color} stroke="#fff" strokeWidth={0.5} />);
      startAngle = endAngle;
    });
    return (
      <svg viewBox={`0 0 ${VW} ${VH}`} style={{ width: '100%', height: '100%' }}>
        {slices}
      </svg>
    );
  }

  if (chartType === 'line') {
    const bottom = VH - 4;
    const left = 4;
    const right = VW - 4;
    const top = 4;
    const chartW = right - left;
    const chartH = bottom - top;
    const stepX = numCats > 1 ? chartW / (numCats - 1) : chartW;

    return (
      <svg viewBox={`0 0 ${VW} ${VH}`} style={{ width: '100%', height: '100%' }}>
        <rect x={0} y={0} width={VW} height={VH} fill="#f9fafb" />
        {series.map((s, si) => {
          const pts = (s.values ?? []).map((v, ci) => {
            const x = left + ci * stepX;
            const y = bottom - (v / maxVal) * chartH;
            return `${x},${y}`;
          });
          return (
            <polyline
              key={si}
              points={pts.join(' ')}
              fill="none"
              stroke={s.color || '#6366f1'}
              strokeWidth={1.5}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          );
        })}
      </svg>
    );
  }

  // Default: bar chart
  const bottom = VH - 4;
  const left = 4;
  const chartW = VW - left - 4;
  const chartH = bottom - 4;
  const groupW = numCats > 0 ? chartW / numCats : chartW;
  const barW = Math.max(1, (groupW * 0.8) / series.length);
  const barPad = (groupW * 0.2) / 2;

  return (
    <svg viewBox={`0 0 ${VW} ${VH}`} style={{ width: '100%', height: '100%' }}>
      <rect x={0} y={0} width={VW} height={VH} fill="#f9fafb" />
      {series.map((s, si) =>
        (s.values ?? []).map((v, ci) => {
          const barH = Math.max(1, (v / maxVal) * chartH);
          const x = left + ci * groupW + barPad + si * barW;
          const y = bottom - barH;
          return <rect key={`${si}-${ci}`} x={x} y={y} width={barW} height={barH} fill={s.color || '#6366f1'} rx={0.5} />;
        })
      )}
    </svg>
  );
}

// ── Color filter helper (shared with icon tinting) ────────────────────────────

function buildThumbColorFilter(color: string): string {
  try {
    const hex = color.replace('#', '');
    if (hex.length !== 6) return '';
    const r = parseInt(hex.slice(0, 2), 16) / 255;
    const g = parseInt(hex.slice(2, 4), 16) / 255;
    const b = parseInt(hex.slice(4, 6), 16) / 255;
    const l = (Math.max(r, g, b) + Math.min(r, g, b)) / 2;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const d = max - min;
    const s = max === min ? 0 : d / (1 - Math.abs(2 * l - 1));
    let h = 0;
    if (d !== 0) {
      if (max === r) h = ((g - b) / d) % 6;
      else if (max === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h = (h * 60 + 360) % 360;
    }
    return `brightness(0) saturate(100%) invert(${l > 0.5 ? 1 : 0}) sepia(1) saturate(${Math.round(s * 100) + 200}%) hue-rotate(${Math.round(h)}deg) brightness(${l > 0.5 ? 1.2 : 0.8})`;
  } catch {
    return '';
  }
}

/** Minimal SHAPE renderer — mirrors PresentSlideRenderer's ShapeBox. */
function ThumbnailShape({ content }: { content: Record<string, any> }) {
  const shapeType = (content.shapeType as string) || 'RECT';
  const common: React.CSSProperties = {
    width: '100%',
    height: '100%',
    backgroundColor: (content.fill as string) || '#e0e0e0',
    border: `${(content.strokeWidth as number) ?? 2}px solid ${(content.stroke as string) || '#333333'}`,
    boxSizing: 'border-box',
  };

  if (shapeType === 'CIRCLE' || shapeType === 'ELLIPSE') {
    return <div style={{ ...common, borderRadius: '50%' }} />;
  }
  if (shapeType === 'LINE') {
    return (
      <div
        style={{
          width: '100%',
          height: 0,
          borderTop: `${(content.strokeWidth as number) ?? 2}px solid ${(content.stroke as string) || '#333333'}`,
          marginTop: '50%',
        }}
      />
    );
  }
  return (
    <div
      style={{
        ...common,
        borderRadius: content.rx ? `${content.rx as number}px` : undefined,
      }}
    />
  );
}

export default SlideThumbnail;
