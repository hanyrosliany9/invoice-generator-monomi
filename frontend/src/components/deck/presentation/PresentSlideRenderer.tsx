import React, { useEffect, useRef, useState } from 'react';
import { safeUrl } from '@/utils/safeUrl';
import type { DeckSlide } from '@/types/deck';
import type { TransitionType } from '../../../stores/presentationStore';

interface PresentSlideRendererProps {
  slide: DeckSlide;
  width: number;
  height: number;
  /** Which transition animation to apply when this slide enters. */
  transition?: TransitionType;
  /** Duration of the transition in ms. Default: 400 */
  transitionDuration?: number;
}

/**
 * Renders a single slide from its persisted `content` + `elements` (the same
 * source of truth the public viewer and exporter read from), scaled to fill the
 * presentation stage. Element positions/sizes are percentages of the slide, so
 * positioning is resolution-independent.
 *
 * Supports CSS-based enter animations for the 5 transition types:
 *   none | fade | slide-left | slide-right | zoom
 *
 * The animation plays once on mount. Rapid navigation is handled by key-ing
 * on slide.id in the parent so the component remounts fresh for each slide.
 */
export const PresentSlideRenderer: React.FC<PresentSlideRendererProps> = ({
  slide,
  width,
  height,
  transition = 'none',
  transitionDuration = 400,
}) => {
  const { title, subtitle, content = {}, backgroundColor, backgroundImage, elements = [] } = slide;

  const body: string | undefined = content.body;
  const caption: string | undefined = content.caption;
  const leftContent: string | undefined = content.leftContent;
  const rightContent: string | undefined = content.rightContent;
  const items: string[] | undefined = Array.isArray(content.items) ? content.items : undefined;
  const images: { url?: string; caption?: string }[] | undefined = Array.isArray(content.images)
    ? content.images
    : undefined;

  const hasContent =
    !!title || !!subtitle || !!body || !!caption || !!leftContent || !!rightContent ||
    (items?.length ?? 0) > 0 || (images?.length ?? 0) > 0 || elements.length > 0;

  // ── Transition animation ────────────────────────────────────────────────
  // We inject a one-shot <style> tag with a keyframe animation named after
  // the slide id so multiple slides in a rapid transition can't collide.
  const animName = `slide-enter-${slide.id.replace(/[^a-zA-Z0-9]/g, '')}`;
  const [animating, setAnimating] = useState(transition !== 'none');
  const doneRef = useRef(false);

  useEffect(() => {
    if (transition === 'none') return;
    // After the transition duration, clear the animation so subsequent
    // re-renders of the same slide (e.g. window resize) don't re-animate.
    const t = setTimeout(() => {
      if (!doneRef.current) {
        doneRef.current = true;
        setAnimating(false);
      }
    }, transitionDuration + 50);
    return () => clearTimeout(t);
  }, [transition, transitionDuration]);

  // Build the keyframes string for the chosen transition type
  const keyframes = buildKeyframes(animName, transition);
  const animationStyle: React.CSSProperties =
    animating && transition !== 'none'
      ? {
          animation: `${animName} ${transitionDuration}ms ease-out forwards`,
        }
      : {};

  return (
    <>
      {/* One-shot keyframe injection — only present while animating */}
      {animating && transition !== 'none' && (
        <style>{keyframes}</style>
      )}

      <div
        className="absolute inset-0 overflow-hidden"
        style={{ width, height, background: backgroundColor || '#ffffff', ...animationStyle }}
      >
        {/* Background image — full bleed */}
        {safeUrl(backgroundImage) && (
          <img
            src={safeUrl(backgroundImage)}
            alt=""
            className="pointer-events-none absolute inset-0 h-full w-full object-cover select-none"
            aria-hidden="true"
          />
        )}

        {/* Free-form elements: absolutely positioned by percentage */}
        {elements
          .slice()
          .sort((a, b) => a.zIndex - b.zIndex)
          .map((el) => {
            const elContent = el.content ?? {};
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
                }}
              >
                {el.type === 'TEXT' && elContent.text && (
                  <span
                    style={{
                      fontSize: elContent.fontSize ? `${elContent.fontSize}px` : '24px',
                      fontFamily: elContent.fontFamily || 'Inter, sans-serif',
                      fontWeight: elContent.fontWeight as React.CSSProperties['fontWeight'],
                      fontStyle: elContent.fontStyle as React.CSSProperties['fontStyle'],
                      color: elContent.fill || elContent.color || '#000000',
                      textAlign: elContent.textAlign as React.CSSProperties['textAlign'],
                      textDecoration: [
                        elContent.underline ? 'underline' : '',
                        elContent.linethrough ? 'line-through' : '',
                      ].filter(Boolean).join(' ') || undefined,
                      whiteSpace: 'pre-wrap',
                      display: 'block',
                    }}
                  >
                    {elContent.text}
                  </span>
                )}

                {(el.type === 'IMAGE' || el.type === 'VIDEO') && safeUrl(elContent.url) && (
                  <img
                    src={safeUrl(elContent.url)}
                    alt={elContent.alt ?? ''}
                    className="h-full w-full object-contain"
                  />
                )}

                {el.type === 'SHAPE' && (
                  <ShapeBox content={elContent} />
                )}

                {el.type === 'ICON' && elContent.svg && (
                  <IconBox svg={elContent.svg as string} color={elContent.color as string | undefined} />
                )}

                {el.type === 'TABLE' && (
                  <TableBox content={elContent} />
                )}

                {el.type === 'CHART' && (
                  <ChartBox content={elContent} />
                )}
              </div>
            );
          })}

        {/* Template/content overlay — only when there's structured content. */}
        {hasContent && (title || subtitle || body || caption || leftContent || rightContent || items || images) && (
          <div className="relative z-10 flex h-full w-full flex-col items-center justify-center gap-4 p-12 text-center">
            {title && (
              <h2 className="font-display text-4xl font-semibold tracking-tight text-gray-900">
                {title}
              </h2>
            )}
            {subtitle && <p className="text-xl text-gray-600">{subtitle}</p>}
            {(leftContent || rightContent) && (
              <div className="flex w-full max-w-4xl gap-8 text-left">
                {leftContent && <div className="flex-1 whitespace-pre-wrap text-base text-gray-700">{leftContent}</div>}
                {rightContent && <div className="flex-1 whitespace-pre-wrap text-base text-gray-700">{rightContent}</div>}
              </div>
            )}
            {body && <p className="max-w-3xl whitespace-pre-wrap text-base text-gray-700">{body}</p>}
            {caption && <p className="text-sm italic text-gray-500">{caption}</p>}
            {items && items.length > 0 && (
              <ul className="space-y-2 text-left text-base text-gray-700">
                {items.map((item, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-gray-500" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            )}
            {images && images.length > 0 && (
              <div className="grid w-full max-w-4xl grid-cols-3 gap-3">
                {images.map((img, i) => safeUrl(img.url) && (
                  <img key={i} src={safeUrl(img.url)} alt={img.caption ?? ''} className="h-full w-full rounded object-cover" />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
};

// ── Keyframe builder ──────────────────────────────────────────────────────────

function buildKeyframes(name: string, type: TransitionType): string {
  switch (type) {
    case 'fade':
      return `@keyframes ${name} { from { opacity: 0; } to { opacity: 1; } }`;

    case 'slide-left':
      // New slide enters from the right
      return `@keyframes ${name} { from { transform: translateX(100%); } to { transform: translateX(0); } }`;

    case 'slide-right':
      // New slide enters from the left
      return `@keyframes ${name} { from { transform: translateX(-100%); } to { transform: translateX(0); } }`;

    case 'zoom':
      return `@keyframes ${name} { from { transform: scale(0.85); opacity: 0; } to { transform: scale(1); opacity: 1; } }`;

    default:
      return '';
  }
}

/* Render a SHAPE element as a styled div approximation. */
function ShapeBox({ content }: { content: Record<string, unknown> }) {
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
  return <div style={{ ...common, borderRadius: content.rx ? `${content.rx as number}px` : undefined }} />;
}

// ── ICON renderer ────────────────────────────────────────────────────────────

/**
 * Renders an ICON element by injecting the raw SVG markup into a container div.
 * If `color` is provided the SVG's fill/stroke are overridden via CSS currentColor.
 */
function IconBox({ svg, color }: { svg: string; color?: string }) {
  // Build a data-URI so we can use an <img> — avoids XSS from dangerouslySetInnerHTML
  // while still rendering arbitrary SVG markup.  For icons created inside the app
  // the SVG is first-party, but the data-URI approach is the safer default.
  const dataUri = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: color || 'inherit',
      }}
    >
      <img
        src={dataUri}
        alt=""
        aria-hidden="true"
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          // CSS filter to tint monochrome SVGs when a color is requested.
          // Works best for black-on-transparent icons (common in icon libraries).
          filter: color ? buildColorFilter(color) : undefined,
        }}
      />
    </div>
  );
}

// ── TABLE renderer ────────────────────────────────────────────────────────────

interface TableContent {
  rows?: number;
  cols?: number;
  cells?: string[][];
  headerRow?: boolean;
  borderColor?: string;
  headerBg?: string;
  textColor?: string;
  fontSize?: number;
}

function TableBox({ content }: { content: Record<string, unknown> }) {
  const {
    cells = [],
    headerRow = false,
    borderColor = '#cccccc',
    headerBg = '#374151',
    textColor = '#000000',
    fontSize = 14,
  } = content as TableContent;

  if (!Array.isArray(cells) || cells.length === 0) {
    return (
      <div style={{ width: '100%', height: '100%', border: `1px solid ${borderColor}`, boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center', color: textColor, fontSize }}>
        Table
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: '100%', overflow: 'auto', boxSizing: 'border-box' }}>
      <table
        style={{
          width: '100%',
          height: '100%',
          borderCollapse: 'collapse',
          tableLayout: 'fixed',
          fontSize: `${fontSize}px`,
          color: textColor,
        }}
      >
        <tbody>
          {cells.map((row, rIdx) => {
            const isHeader = headerRow && rIdx === 0;
            return (
              <tr key={rIdx}>
                {(Array.isArray(row) ? row : []).map((cell, cIdx) => (
                  <td
                    key={cIdx}
                    style={{
                      border: `1px solid ${borderColor}`,
                      padding: '4px 6px',
                      backgroundColor: isHeader ? headerBg : undefined,
                      color: isHeader ? '#ffffff' : textColor,
                      fontWeight: isHeader ? 600 : 400,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      verticalAlign: 'middle',
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

// ── CHART renderer ────────────────────────────────────────────────────────────

type ChartType = 'bar' | 'line' | 'pie';

interface ChartSeries {
  name: string;
  color: string;
  values: number[];
}

interface ChartContent {
  chartType?: ChartType;
  labels?: string[];
  series?: ChartSeries[];
  title?: string;
  showLegend?: boolean;
}

function ChartBox({ content }: { content: Record<string, unknown> }) {
  const {
    chartType = 'bar',
    labels = [],
    series = [],
    title,
    showLegend = true,
  } = content as ChartContent;

  const TITLE_H = title ? 24 : 0;
  const LEGEND_H = showLegend && series.length > 0 ? 20 : 0;
  const LABEL_H = chartType !== 'pie' && labels.length > 0 ? 20 : 0;
  const CHART_PAD = 8;

  // We render a fully responsive SVG that fills the container.
  // viewBox is fixed at 400×240 and scaled via preserveAspectRatio.
  const VW = 400;
  const VH = 240;
  const chartTop = TITLE_H + CHART_PAD;
  const chartBottom = VH - LABEL_H - LEGEND_H - CHART_PAD;
  const chartLeft = 40;
  const chartRight = VW - CHART_PAD;
  const chartW = chartRight - chartLeft;
  const chartH = chartBottom - chartTop;

  // Flatten all values to find global max
  const allValues = series.flatMap((s) => s.values ?? []);
  const maxVal = allValues.length > 0 ? Math.max(...allValues, 0.001) : 1;

  const numCategories = Math.max(labels.length, series[0]?.values?.length ?? 0);

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <svg
        viewBox={`0 0 ${VW} ${VH}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ width: '100%', height: '100%', display: 'block' }}
      >
        {/* Title */}
        {title && (
          <text x={VW / 2} y={16} textAnchor="middle" fontSize={14} fontWeight={600} fill="#111827">
            {title}
          </text>
        )}

        {chartType === 'pie'
          ? renderPie({ series, cx: VW / 2, cy: (chartTop + chartBottom) / 2, r: Math.min(chartW, chartH) / 2 - 4 })
          : chartType === 'line'
          ? renderLine({ series, labels, maxVal, numCategories, chartLeft, chartTop, chartW, chartH })
          : renderBar({ series, labels, maxVal, numCategories, chartLeft, chartTop, chartW, chartH })
        }

        {/* X-axis labels (bar / line only) */}
        {chartType !== 'pie' && labels.length > 0 && (
          <>
            {labels.map((label, i) => {
              const x = chartLeft + (i + 0.5) * (chartW / numCategories);
              return (
                <text key={i} x={x} y={chartBottom + 14} textAnchor="middle" fontSize={9} fill="#6b7280">
                  {label.length > 8 ? label.slice(0, 7) + '…' : label}
                </text>
              );
            })}
          </>
        )}

        {/* Legend */}
        {showLegend && series.length > 0 && (
          <>
            {series.map((s, i) => {
              const lx = chartLeft + i * 90;
              const ly = VH - LEGEND_H / 2;
              return (
                <g key={i}>
                  <rect x={lx} y={ly - 5} width={10} height={10} fill={s.color || '#6366f1'} rx={2} />
                  <text x={lx + 14} y={ly + 5} fontSize={9} fill="#374151">
                    {s.name?.length > 10 ? s.name.slice(0, 9) + '…' : (s.name ?? '')}
                  </text>
                </g>
              );
            })}
          </>
        )}
      </svg>
    </div>
  );
}

// ── Chart sub-renderers ──────────────────────────────────────────────────────

interface BarLineProps {
  series: ChartSeries[];
  labels: string[];
  maxVal: number;
  numCategories: number;
  chartLeft: number;
  chartTop: number;
  chartW: number;
  chartH: number;
}

function renderBar({ series, maxVal, numCategories, chartLeft, chartTop, chartW, chartH }: BarLineProps) {
  if (numCategories === 0 || series.length === 0) return null;
  const groupW = chartW / numCategories;
  const barW = Math.max(2, (groupW * 0.8) / series.length);
  const barPad = (groupW * 0.2) / 2;
  const bottom = chartTop + chartH;

  return (
    <g>
      {/* Axis line */}
      <line x1={chartLeft} y1={bottom} x2={chartLeft + chartW} y2={bottom} stroke="#d1d5db" strokeWidth={1} />
      {series.map((s, si) =>
        (s.values ?? []).map((v, ci) => {
          const barH = Math.max(1, (v / maxVal) * chartH);
          const x = chartLeft + ci * groupW + barPad + si * barW;
          const y = bottom - barH;
          return (
            <rect key={`${si}-${ci}`} x={x} y={y} width={barW} height={barH} fill={s.color || '#6366f1'} rx={1} />
          );
        })
      )}
    </g>
  );
}

function renderLine({ series, maxVal, numCategories, chartLeft, chartTop, chartW, chartH }: BarLineProps) {
  if (numCategories === 0 || series.length === 0) return null;
  const bottom = chartTop + chartH;
  const stepX = numCategories > 1 ? chartW / (numCategories - 1) : chartW;

  return (
    <g>
      <line x1={chartLeft} y1={bottom} x2={chartLeft + chartW} y2={bottom} stroke="#d1d5db" strokeWidth={1} />
      {series.map((s, si) => {
        const pts = (s.values ?? []).map((v, ci) => {
          const x = chartLeft + ci * stepX;
          const y = bottom - (v / maxVal) * chartH;
          return `${x},${y}`;
        });
        return (
          <g key={si}>
            <polyline
              points={pts.join(' ')}
              fill="none"
              stroke={s.color || '#6366f1'}
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            {(s.values ?? []).map((v, ci) => (
              <circle
                key={ci}
                cx={chartLeft + ci * stepX}
                cy={bottom - (v / maxVal) * chartH}
                r={3}
                fill={s.color || '#6366f1'}
              />
            ))}
          </g>
        );
      })}
    </g>
  );
}

function renderPie({
  series,
  cx,
  cy,
  r,
}: {
  series: ChartSeries[];
  cx: number;
  cy: number;
  r: number;
}) {
  if (series.length === 0) return null;

  // Use first series only; each value is a slice
  const values = series[0]?.values ?? [];
  const total = values.reduce((a, b) => a + b, 0);
  if (total === 0) return null;

  const slices: React.ReactElement[] = [];
  let startAngle = -Math.PI / 2; // Start from top

  values.forEach((v, i) => {
    const sweep = (v / total) * 2 * Math.PI;
    const endAngle = startAngle + sweep;
    const x1 = cx + r * Math.cos(startAngle);
    const y1 = cy + r * Math.sin(startAngle);
    const x2 = cx + r * Math.cos(endAngle);
    const y2 = cy + r * Math.sin(endAngle);
    const largeArc = sweep > Math.PI ? 1 : 0;
    const color = series[i]?.color || series[0]?.color || '#6366f1';
    const d = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;
    slices.push(<path key={i} d={d} fill={color} stroke="#ffffff" strokeWidth={1} />);
    startAngle = endAngle;
  });

  return <g>{slices}</g>;
}

// ── Color tinting utility ────────────────────────────────────────────────────

/**
 * Converts a hex color to an approximate CSS `filter: drop-shadow` tint.
 * For a more robust tint, consider the SVG `feColorMatrix` approach.
 * This simple approach works well for solid-color (monochrome) icons.
 */
function buildColorFilter(color: string): string {
  // We use `brightness(0)` to turn the icon black, then `invert` + sepia + hue-rotate
  // to approximate the target color. This is a rough approximation but works well
  // for typical icon library SVGs that are solid black on transparent.
  //
  // A pure-CSS approach: convert the hex to hsl and build the filter chain.
  // For simplicity we'll just use drop-shadow with the color to tint non-white icons.
  // The most reliable single-pass approach for arbitrary colors:
  try {
    const hex = color.replace('#', '');
    if (hex.length !== 6) return '';
    const r = parseInt(hex.slice(0, 2), 16) / 255;
    const g = parseInt(hex.slice(2, 4), 16) / 255;
    const b = parseInt(hex.slice(4, 6), 16) / 255;
    // Turn icon black, then recolor via sepia + saturate + hue-rotate approximation
    const h = rgbToHue(r, g, b);
    const s = rgbToSat(r, g, b);
    const l = (Math.max(r, g, b) + Math.min(r, g, b)) / 2;
    // brightness(0) makes it black; then we add color back
    const sat = Math.round(s * 100);
    const bri = Math.round(l * 1000) / 10;
    return `brightness(0) saturate(100%) invert(${l > 0.5 ? 1 : 0}) sepia(1) saturate(${sat + 200}%) hue-rotate(${Math.round(h)}deg) brightness(${bri > 50 ? 1.2 : 0.8})`;
  } catch {
    return '';
  }
}

function rgbToHue(r: number, g: number, b: number): number {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  if (d === 0) return 0;
  let h = 0;
  if (max === r) h = ((g - b) / d) % 6;
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return (h * 60 + 360) % 360;
}

function rgbToSat(r: number, g: number, b: number): number {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  return max === min ? 0 : (max - min) / (1 - Math.abs(2 * l - 1));
}

export default PresentSlideRenderer;
