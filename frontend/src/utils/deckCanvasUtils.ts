import {
  Canvas as FabricCanvas,
  IText,
  Textbox,
  Rect,
  Circle,
  FabricImage,
  FabricObject,
  Triangle,
  Line,
  Polyline,
  Polygon,
  Ellipse,
  Path,
  Group,
  ActiveSelection,
  Shadow,
  Gradient,
} from 'fabric';
import type { DeckSlideElement } from '../types/deck';

/* ------------------------------------------------------------------ */
/* SHARED STYLING ROUND-TRIP HELPERS                                   */
/*                                                                      */
/* These serialize/deserialize the object-styling features (shadow,    */
/* gradient fill, lock state) into element.content so they survive a    */
/* DB save → reload (the per-object DB path that goes through           */
/* fabricObjectToElement / elementToFabricObject). The undo/redo +      */
/* realtime-collab path goes through canvas.loadFromJSON which already   */
/* round-trips these natively (shadow/fill are core fabric props), so   */
/* the work here is purely for the DB element model.                    */
/* ------------------------------------------------------------------ */

// Plain JSON for a fabric Shadow → content.shadow
export interface SerializedShadow {
  color: string;
  blur: number;
  offsetX: number;
  offsetY: number;
}

export const serializeShadow = (obj: FabricObject): SerializedShadow | undefined => {
  const shadow = obj.shadow as Shadow | null | undefined;
  if (!shadow) return undefined;
  return {
    color: shadow.color || 'rgba(0,0,0,0.3)',
    blur: shadow.blur || 0,
    offsetX: shadow.offsetX || 0,
    offsetY: shadow.offsetY || 0,
  };
};

export const shadowFromContent = (data: SerializedShadow | undefined): Shadow | null => {
  if (!data) return null;
  return new Shadow({
    color: data.color || 'rgba(0,0,0,0.3)',
    blur: data.blur || 0,
    offsetX: data.offsetX || 0,
    offsetY: data.offsetY || 0,
  });
};

// Plain JSON for a 2-stop linear gradient fill → content.gradient
export interface SerializedGradient {
  type: 'linear';
  angle?: number; // degrees, 0 = left→right
  stops: { offset: number; color: string }[];
}

// Read a gradient fill off an object (only linear 2+ stop gradients).
export const serializeGradient = (
  fill: unknown,
  width: number,
  height: number,
): SerializedGradient | undefined => {
  if (!fill || typeof fill !== 'object') return undefined;
  const g = fill as Gradient<'linear'>;
  if ((g as any).type !== 'linear' || !Array.isArray(g.colorStops)) return undefined;
  // Derive an approximate angle from the coords (best-effort).
  const c = g.coords as any;
  let angle = 0;
  if (c) {
    angle = (Math.atan2((c.y2 || 0) - (c.y1 || 0), (c.x2 || 0) - (c.x1 || 0)) * 180) / Math.PI;
  }
  return {
    type: 'linear',
    angle,
    stops: g.colorStops.map((s: any) => ({ offset: s.offset, color: s.color })),
  };
};

// Build a fabric linear Gradient sized to an object's local bounding box.
export const gradientFromContent = (
  data: SerializedGradient | undefined,
  width: number,
  height: number,
): Gradient<'linear'> | undefined => {
  if (!data || data.type !== 'linear' || !data.stops || data.stops.length < 2) return undefined;
  const angle = ((data.angle || 0) * Math.PI) / 180;
  // Project the angle onto the box so the gradient spans the full object.
  const w = width || 1;
  const h = height || 1;
  const cx = w / 2;
  const cy = h / 2;
  const dx = (Math.cos(angle) * w) / 2;
  const dy = (Math.sin(angle) * h) / 2;
  return new Gradient<'linear'>({
    type: 'linear',
    gradientUnits: 'pixels',
    coords: { x1: cx - dx, y1: cy - dy, x2: cx + dx, y2: cy + dy },
    colorStops: data.stops.map((s) => ({ offset: s.offset, color: s.color })),
  });
};

// Apply the persisted lock state to a freshly created object.
export const applyLockState = (obj: FabricObject, isLocked: boolean | undefined) => {
  if (!isLocked) return;
  obj.set({
    lockMovementX: true,
    lockMovementY: true,
    lockScalingX: true,
    lockScalingY: true,
    lockRotation: true,
    // Stay selectable so the user can click it to unlock; just immovable.
    hasControls: false,
    editable: false,
  } as any);
};

// Custom (non-core) fabric props the property panels must include in toJSON so
// undo/redo + realtime-collab snapshots round-trip our styling extras. Core
// fabric props (shadow, fill/gradient, styles, charSpacing, lineHeight,
// textBackgroundColor, lockMovement*, etc.) serialize natively and need not be
// listed; only the bespoke props we hang on the instance do.
export const DECK_TOJSON_PROPS = [
  'id',
  'elementId',
  'elementType',
  'assetId',
  'assetUrl',
  'zIndex',
  'flipX',
  'flipY',
  'shapeType',
  // bespoke styling props (not part of fabric core serialization)
  'listType',
  'verticalAlign',
  'spaceBefore',
  'spaceAfter',
  'autofit',
  'link',
  'isLocked',
  // ICON / TABLE / CHART: each is a single element drawn as a fabric Group.
  // The source content is stored on the instance (elementContent) plus typed
  // aliases so the undo/redo + realtime-collab loadFromJSON snapshots round-trip
  // the data verbatim (a re-loaded Group keeps these custom props).
  'elementContent',
  'iconSvg',
  'tableData',
  'chartData',
];

/* ------------------------------------------------------------------ */
/* ICON / TABLE / CHART ELEMENT TYPES                                   */
/*                                                                      */
/* These three are *single* deck elements whose visual is composed of   */
/* multiple fabric primitives, so each builder returns a fabric Group   */
/* sized to widthPx x heightPx. The source `content` is stashed on the  */
/* group instance (elementContent + a typed alias) so:                  */
/*  - fabricObjectToElement re-emits it for the per-object DB save       */
/*  - undo/redo + collab loadFromJSON snapshots round-trip it natively   */
/* The visual is derived PURELY from content, so an edit just rebuilds   */
/* the group from new content (see rebuildElementObject).                */
/* ------------------------------------------------------------------ */

export interface IconContent {
  svg: string; // full <svg>...</svg> markup
  color?: string;
  name?: string;
}

export interface TableContent {
  rows: number;
  cols: number;
  cells: string[][]; // rows x cols
  headerRow: boolean;
  borderColor: string;
  headerBg: string;
  textColor: string;
  fontSize: number;
}

export interface ChartSeries {
  name: string;
  color: string;
  values: number[];
}

export interface ChartContent {
  chartType: 'bar' | 'line' | 'pie';
  labels: string[];
  series: ChartSeries[];
  title?: string;
  showLegend: boolean;
}

export interface BuildElementOpts {
  id?: string;
  left?: number;
  top?: number;
  angle?: number;
  flipX?: boolean;
  flipY?: boolean;
  zIndex?: number;
}

const applyGroupOpts = (group: Group, opts: BuildElementOpts, elementType: string) => {
  group.set('id', opts.id || generateElementId());
  group.set('elementType', elementType);
  if (opts.left !== undefined) group.set('left', opts.left);
  if (opts.top !== undefined) group.set('top', opts.top);
  if (opts.angle !== undefined) group.set('angle', opts.angle);
  if (opts.flipX !== undefined) group.set('flipX', opts.flipX);
  if (opts.flipY !== undefined) group.set('flipY', opts.flipY);
  if (opts.zIndex !== undefined) group.set('zIndex', opts.zIndex);
};

/* ---------------- ICON ---------------- */

// Default icon content (a simple square placeholder svg) for safety.
const DEFAULT_ICON_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>';

// Build an ICON element. Loads content.svg as a FabricImage (via a data-URI)
// scaled to fill the box, wrapped in a Group so geometry round-trips uniformly
// with TABLE/CHART. Returns a Promise because image decode is async.
export const buildIconObject = async (
  content: IconContent,
  widthPx: number,
  heightPx: number,
  opts: BuildElementOpts = {},
): Promise<Group> => {
  const svg = content?.svg || DEFAULT_ICON_SVG;
  const dataUri = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  let img: FabricImage;
  try {
    img = await FabricImage.fromURL(dataUri);
  } catch {
    img = await FabricImage.fromURL(`data:image/svg+xml;utf8,${encodeURIComponent(DEFAULT_ICON_SVG)}`);
  }
  // Scale the icon to fill the box while keeping its aspect ratio (contain).
  const iw = img.width || 24;
  const ih = img.height || 24;
  const scale = Math.min(widthPx / iw, heightPx / ih);
  img.set({
    originX: 'center',
    originY: 'center',
    left: 0,
    top: 0,
    scaleX: scale,
    scaleY: scale,
  });

  const group = new Group([img], {
    width: widthPx,
    height: heightPx,
    subTargetCheck: false,
  });
  applyGroupOpts(group, opts, 'ICON');
  group.set('elementContent', content);
  group.set('iconSvg', svg);
  return group;
};

/* ---------------- TABLE ---------------- */

const DEFAULT_TABLE_CONTENT = (): TableContent => ({
  rows: 3,
  cols: 3,
  cells: [
    ['Header 1', 'Header 2', 'Header 3'],
    ['', '', ''],
    ['', '', ''],
  ],
  headerRow: true,
  borderColor: '#d1d5db',
  headerBg: '#1e293b',
  textColor: '#111827',
  fontSize: 14,
});

// Build a TABLE element as a Group of cell rectangles + Textboxes laid out in a
// uniform grid. Header row (if enabled) uses headerBg with contrasting text.
export const buildTableObject = (
  content: TableContent,
  widthPx: number,
  heightPx: number,
  opts: BuildElementOpts = {},
): Group => {
  const c: TableContent = {
    ...DEFAULT_TABLE_CONTENT(),
    ...(content || {}),
  };
  const rows = Math.max(1, c.rows || 1);
  const cols = Math.max(1, c.cols || 1);
  const cells = c.cells || [];
  const cellW = widthPx / cols;
  const cellH = heightPx / rows;
  const border = c.borderColor || '#d1d5db';
  const fontSize = c.fontSize || 14;

  const objects: FabricObject[] = [];
  // Origin of children is top-left of the group's local box (-w/2, -h/2).
  const ox = -widthPx / 2;
  const oy = -heightPx / 2;

  for (let r = 0; r < rows; r++) {
    for (let col = 0; col < cols; col++) {
      const isHeader = c.headerRow && r === 0;
      const x = ox + col * cellW;
      const y = oy + r * cellH;
      const rect = new Rect({
        left: x,
        top: y,
        width: cellW,
        height: cellH,
        fill: isHeader ? c.headerBg || '#1e293b' : '#ffffff',
        stroke: border,
        strokeWidth: 1,
        originX: 'left',
        originY: 'top',
        selectable: false,
        evented: false,
      });
      objects.push(rect);

      const text = (cells[r] && cells[r][col] != null ? String(cells[r][col]) : '');
      const tb = new Textbox(text, {
        left: x + 6,
        top: y + cellH / 2,
        width: Math.max(10, cellW - 12),
        fontSize,
        fontFamily: 'Inter, sans-serif',
        fill: isHeader ? '#ffffff' : c.textColor || '#111827',
        fontWeight: isHeader ? 'bold' : 'normal',
        textAlign: 'left',
        originX: 'left',
        originY: 'center',
        editable: false,
        selectable: false,
        evented: false,
        splitByGrapheme: false,
      });
      objects.push(tb);
    }
  }

  const group = new Group(objects, {
    width: widthPx,
    height: heightPx,
    subTargetCheck: false,
  });
  applyGroupOpts(group, opts, 'TABLE');
  group.set('elementContent', c);
  group.set('tableData', c);
  return group;
};

/* ---------------- CHART ---------------- */

const DEFAULT_CHART_CONTENT = (): ChartContent => ({
  chartType: 'bar',
  labels: ['A', 'B', 'C'],
  series: [{ name: 'Series 1', color: '#3b82f6', values: [4, 7, 5] }],
  title: '',
  showLegend: true,
});

// Build a CHART element (bar | line | pie) from fabric primitives, sized to the
// box, with an optional title band + legend strip. No external chart lib.
export const buildChartObject = (
  content: ChartContent,
  widthPx: number,
  heightPx: number,
  opts: BuildElementOpts = {},
): Group => {
  const c: ChartContent = {
    ...DEFAULT_CHART_CONTENT(),
    ...(content || {}),
  };
  const labels = c.labels || [];
  const series = (c.series || []).filter((s) => s && Array.isArray(s.values));
  const objects: FabricObject[] = [];

  const ox = -widthPx / 2;
  const oy = -heightPx / 2;

  // Background panel.
  objects.push(
    new Rect({
      left: ox,
      top: oy,
      width: widthPx,
      height: heightPx,
      fill: '#ffffff',
      stroke: '#e5e7eb',
      strokeWidth: 1,
      originX: 'left',
      originY: 'top',
      selectable: false,
      evented: false,
    }),
  );

  const pad = Math.max(8, Math.min(widthPx, heightPx) * 0.06);
  let plotTop = oy + pad;
  const plotLeft = ox + pad;
  let plotBottom = oy + heightPx - pad;
  const plotRight = ox + widthPx - pad;

  // Title band.
  if (c.title) {
    const titleHeight = Math.min(28, heightPx * 0.14);
    objects.push(
      new Textbox(c.title, {
        left: ox,
        top: oy + pad / 2,
        width: widthPx,
        fontSize: Math.max(10, Math.min(20, heightPx * 0.08)),
        fontFamily: 'Inter, sans-serif',
        fontWeight: 'bold',
        fill: '#111827',
        textAlign: 'center',
        originX: 'left',
        originY: 'top',
        editable: false,
        selectable: false,
        evented: false,
      }),
    );
    plotTop += titleHeight;
  }

  // Legend strip at the bottom.
  if (c.showLegend && series.length > 0) {
    const legendH = Math.min(22, heightPx * 0.1);
    plotBottom -= legendH;
    const swatch = Math.min(12, legendH * 0.7);
    let lx = plotLeft;
    const ly = plotBottom + (legendH - swatch) / 2;
    series.forEach((s) => {
      objects.push(
        new Rect({
          left: lx,
          top: ly,
          width: swatch,
          height: swatch,
          fill: s.color || '#3b82f6',
          originX: 'left',
          originY: 'top',
          selectable: false,
          evented: false,
        }),
      );
      const label = new Textbox(s.name || '', {
        left: lx + swatch + 4,
        top: ly + swatch / 2,
        width: 80,
        fontSize: Math.max(8, swatch),
        fontFamily: 'Inter, sans-serif',
        fill: '#374151',
        originX: 'left',
        originY: 'center',
        editable: false,
        selectable: false,
        evented: false,
      });
      objects.push(label);
      lx += swatch + 8 + Math.min(90, (s.name || '').length * 7 + 12);
    });
  }

  const plotW = Math.max(1, plotRight - plotLeft);
  const plotH = Math.max(1, plotBottom - plotTop);

  if (c.chartType === 'pie') {
    // Pie from the first series' values (or sum across series' first column).
    const values = series.length > 0 ? series[0].values : [];
    const total = values.reduce((a, b) => a + (Number(b) || 0), 0) || 1;
    const radius = Math.min(plotW, plotH) / 2;
    const cx = plotLeft + plotW / 2;
    const cy = plotTop + plotH / 2;
    const palette = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];
    let startAngle = -Math.PI / 2;
    values.forEach((v, i) => {
      const frac = (Number(v) || 0) / total;
      const endAngle = startAngle + frac * Math.PI * 2;
      const x1 = cx + radius * Math.cos(startAngle);
      const y1 = cy + radius * Math.sin(startAngle);
      const x2 = cx + radius * Math.cos(endAngle);
      const y2 = cy + radius * Math.sin(endAngle);
      const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;
      const d = `M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`;
      objects.push(
        new Path(d, {
          fill: (series[0]?.color && i === 0 ? series[0].color : palette[i % palette.length]),
          stroke: '#ffffff',
          strokeWidth: 1,
          originX: 'left',
          originY: 'top',
          selectable: false,
          evented: false,
        }),
      );
      startAngle = endAngle;
    });
  } else {
    // bar | line: shared category x-axis from labels.
    const catCount = Math.max(labels.length, series.reduce((m, s) => Math.max(m, s.values.length), 0), 1);
    let maxVal = 0;
    series.forEach((s) => s.values.forEach((v) => (maxVal = Math.max(maxVal, Number(v) || 0))));
    if (maxVal <= 0) maxVal = 1;

    // Baseline axis.
    objects.push(
      new Line([plotLeft, plotBottom, plotRight, plotBottom], {
        stroke: '#9ca3af',
        strokeWidth: 1,
        selectable: false,
        evented: false,
      }),
    );

    if (c.chartType === 'bar') {
      const groupW = plotW / catCount;
      const seriesCount = Math.max(series.length, 1);
      const barGap = groupW * 0.2;
      const barW = (groupW - barGap) / seriesCount;
      for (let cat = 0; cat < catCount; cat++) {
        series.forEach((s, si) => {
          const v = Number(s.values[cat]) || 0;
          const h = (v / maxVal) * plotH;
          const x = plotLeft + cat * groupW + barGap / 2 + si * barW;
          objects.push(
            new Rect({
              left: x,
              top: plotBottom - h,
              width: Math.max(1, barW - 1),
              height: Math.max(0, h),
              fill: s.color || '#3b82f6',
              originX: 'left',
              originY: 'top',
              selectable: false,
              evented: false,
            }),
          );
        });
      }
    } else {
      // line
      const stepX = catCount > 1 ? plotW / (catCount - 1) : 0;
      series.forEach((s) => {
        const pts: { x: number; y: number }[] = [];
        for (let cat = 0; cat < catCount; cat++) {
          const v = Number(s.values[cat]) || 0;
          const x = plotLeft + (catCount > 1 ? cat * stepX : plotW / 2);
          const y = plotBottom - (v / maxVal) * plotH;
          pts.push({ x, y });
        }
        if (pts.length === 1) {
          objects.push(
            new Circle({
              left: pts[0].x,
              top: pts[0].y,
              radius: 3,
              fill: s.color || '#3b82f6',
              originX: 'center',
              originY: 'center',
              selectable: false,
              evented: false,
            }),
          );
        } else if (pts.length > 1) {
          objects.push(
            new Polyline(pts, {
              fill: '',
              stroke: s.color || '#3b82f6',
              strokeWidth: 2,
              originX: 'left',
              originY: 'top',
              selectable: false,
              evented: false,
              objectCaching: false,
            }),
          );
        }
      });
    }
  }

  const group = new Group(objects, {
    width: widthPx,
    height: heightPx,
    subTargetCheck: false,
  });
  applyGroupOpts(group, opts, 'CHART');
  group.set('elementContent', c);
  group.set('chartData', c);
  return group;
};

/* ------------------------------------------------------------------ */
/* EDIT RE-RENDER HELPER                                                */
/*                                                                      */
/* When a property panel mutates an ICON/TABLE/CHART's content, rebuild  */
/* the on-canvas group in place: same id/position/size/angle, swap the   */
/* object, reselect it, and fire object:modified so it autosaves + adds  */
/* an undo entry. Returns the new object (or null on no-op).             */
/* ------------------------------------------------------------------ */
export const rebuildElementObject = async (
  canvas: FabricCanvas,
  oldObj: FabricObject,
  newContent: IconContent | TableContent | ChartContent,
): Promise<FabricObject | null> => {
  const elementType = oldObj.get('elementType') as string;
  if (!['ICON', 'TABLE', 'CHART'].includes(elementType)) return null;

  // Preserve the *rendered* footprint and transform.
  const widthPx = oldObj.getScaledWidth();
  const heightPx = oldObj.getScaledHeight();
  const opts: BuildElementOpts = {
    id: (oldObj.get('id') as string) || generateElementId(),
    left: oldObj.left,
    top: oldObj.top,
    angle: oldObj.angle || 0,
    flipX: !!oldObj.flipX,
    flipY: !!oldObj.flipY,
    zIndex: (oldObj.get('zIndex') as number) || 0,
  };

  let newObj: FabricObject | null = null;
  if (elementType === 'ICON') {
    newObj = await buildIconObject(newContent as IconContent, widthPx, heightPx, opts);
  } else if (elementType === 'TABLE') {
    newObj = buildTableObject(newContent as TableContent, widthPx, heightPx, opts);
  } else if (elementType === 'CHART') {
    newObj = buildChartObject(newContent as ChartContent, widthPx, heightPx, opts);
  }
  if (!newObj) return null;

  // Keep the same origin the old object used so the swap doesn't drift.
  newObj.set({ originX: oldObj.originX, originY: oldObj.originY });

  canvas.remove(oldObj);
  canvas.add(newObj);
  canvas.setActiveObject(newObj);
  canvas.requestRenderAll();
  canvas.fire('object:modified', { target: newObj });
  return newObj;
};

// Generate unique ID
export const generateElementId = (): string => {
  return `el_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Convert percentage to canvas pixels
export const percentToPixel = (percent: number, total: number): number => {
  return (percent / 100) * total;
};

// Convert canvas pixels to percentage
export const pixelToPercent = (pixel: number, total: number): number => {
  return (pixel / total) * 100;
};

// Create interactive text object (double-click to edit)
export const createTextObject = (
  text: string,
  options: Partial<IText> & { id?: string } = {}
): IText => {
  const textObj = new IText(text, {
    left: 100,
    top: 100,
    fontSize: 24,
    fontFamily: 'Inter, sans-serif',
    fill: '#000000',
    editable: true,
    ...options,
  });
  textObj.set('id', options.id || generateElementId());
  textObj.set('elementType', 'TEXT');
  return textObj;
};

// Create heading text (larger, bold)
export const createHeadingObject = (
  text: string,
  options: Partial<IText> & { id?: string } = {}
): IText => {
  return createTextObject(text, {
    fontSize: 48,
    fontWeight: 'bold',
    ...options,
  });
};

// Create subheading text
export const createSubheadingObject = (
  text: string,
  options: Partial<IText> & { id?: string } = {}
): IText => {
  return createTextObject(text, {
    fontSize: 32,
    fontWeight: '500',
    fill: '#666666',
    ...options,
  });
};

// Create body text
export const createBodyTextObject = (
  text: string,
  options: Partial<IText> & { id?: string } = {}
): IText => {
  return createTextObject(text, {
    fontSize: 18,
    fontWeight: 'normal',
    ...options,
  });
};

// Create rectangle
export const createRectObject = (
  options: Partial<Rect> & { id?: string } = {}
): Rect => {
  const rect = new Rect({
    left: 100,
    top: 100,
    width: 200,
    height: 100,
    fill: '#e0e0e0',
    stroke: '#333333',
    strokeWidth: 2,
    rx: 8,
    ry: 8,
    ...options,
  });
  rect.set('id', options.id || generateElementId());
  rect.set('elementType', 'SHAPE');
  return rect;
};

// Create circle
export const createCircleObject = (
  options: Partial<Circle> & { id?: string } = {}
): Circle => {
  const circle = new Circle({
    left: 100,
    top: 100,
    radius: 50,
    fill: '#e0e0e0',
    stroke: '#333333',
    strokeWidth: 2,
    ...options,
  });
  circle.set('id', options.id || generateElementId());
  circle.set('elementType', 'SHAPE');
  return circle;
};

// Create triangle
export const createTriangleObject = (
  options: Partial<Triangle> & { id?: string } = {}
): Triangle => {
  const triangle = new Triangle({
    left: 100,
    top: 100,
    width: 100,
    height: 100,
    fill: '#e0e0e0',
    stroke: '#333333',
    strokeWidth: 2,
    ...options,
  });
  triangle.set('id', options.id || generateElementId());
  triangle.set('elementType', 'SHAPE');
  return triangle;
};

// Create line
export const createLineObject = (
  points: [number, number, number, number] = [0, 0, 200, 0],
  options: Partial<Line> & { id?: string } = {}
): Line => {
  const line = new Line(points, {
    stroke: '#333333',
    strokeWidth: 3,
    ...options,
  });
  line.set('id', options.id || generateElementId());
  line.set('elementType', 'SHAPE');
  line.set('shapeType', 'LINE');
  return line;
};

// Create ellipse
export const createEllipseObject = (
  options: Partial<Ellipse> & { id?: string } = {}
): Ellipse => {
  const ellipse = new Ellipse({
    left: 100,
    top: 100,
    rx: 80,
    ry: 50,
    fill: '#e0e0e0',
    stroke: '#333333',
    strokeWidth: 2,
    ...options,
  });
  ellipse.set('id', options.id || generateElementId());
  ellipse.set('elementType', 'SHAPE');
  ellipse.set('shapeType', 'ELLIPSE');
  return ellipse;
};

// Create arrow (using Path)
export const createArrowObject = (
  options: { id?: string; direction?: 'right' | 'left' | 'up' | 'down' } = {}
): Path => {
  // Right-pointing arrow path
  const arrowPath = 'M 0 20 L 60 20 L 60 10 L 80 25 L 60 40 L 60 30 L 0 30 Z';

  const arrow = new Path(arrowPath, {
    left: 100,
    top: 100,
    fill: '#333333',
    stroke: '#333333',
    strokeWidth: 1,
  });

  // Rotate based on direction
  if (options.direction === 'left') arrow.rotate(180);
  if (options.direction === 'up') arrow.rotate(-90);
  if (options.direction === 'down') arrow.rotate(90);

  arrow.set('id', options.id || generateElementId());
  arrow.set('elementType', 'SHAPE');
  arrow.set('shapeType', 'ARROW');
  return arrow;
};

// Create star shape
export const createStarObject = (
  options: { id?: string; points?: number } = {}
): Polygon => {
  const points = options.points || 5;
  const outerRadius = 50;
  const innerRadius = 25;
  const starPoints: { x: number; y: number }[] = [];

  for (let i = 0; i < points * 2; i++) {
    const radius = i % 2 === 0 ? outerRadius : innerRadius;
    const angle = (Math.PI / points) * i - Math.PI / 2;
    starPoints.push({
      x: radius * Math.cos(angle),
      y: radius * Math.sin(angle),
    });
  }

  const star = new Polygon(starPoints, {
    left: 100,
    top: 100,
    fill: '#ffd700',
    stroke: '#333333',
    strokeWidth: 2,
  });

  star.set('id', options.id || generateElementId());
  star.set('elementType', 'SHAPE');
  star.set('shapeType', 'STAR');
  return star;
};

// Create callout/speech bubble
export const createCalloutObject = (
  options: Partial<Path> & { id?: string } = {}
): Path => {
  // Rounded rectangle with pointer
  const calloutPath = `
    M 10 0
    L 140 0
    Q 150 0 150 10
    L 150 60
    Q 150 70 140 70
    L 40 70
    L 20 90
    L 30 70
    L 10 70
    Q 0 70 0 60
    L 0 10
    Q 0 0 10 0
    Z
  `;

  const callout = new Path(calloutPath, {
    left: 100,
    top: 100,
    fill: '#ffffff',
    stroke: '#333333',
    strokeWidth: 2,
    ...options,
  });

  callout.set('id', options.id || generateElementId());
  callout.set('elementType', 'SHAPE');
  callout.set('shapeType', 'CALLOUT');
  return callout;
};

// Create horizontal line
export const createHorizontalLineObject = (
  width: number = 200,
  options: Partial<Line> & { id?: string } = {}
): Line => {
  return createLineObject([0, 0, width, 0], options);
};

// Create vertical line
export const createVerticalLineObject = (
  height: number = 200,
  options: Partial<Line> & { id?: string } = {}
): Line => {
  return createLineObject([0, 0, 0, height], options);
};

// Create image from URL
export const createImageObject = async (
  url: string,
  options: { id?: string; maxWidth?: number; maxHeight?: number } = {}
): Promise<FabricImage> => {
  const img = await FabricImage.fromURL(url, { crossOrigin: 'anonymous' });

  // Scale to fit max dimensions
  if (options.maxWidth && img.width && img.width > options.maxWidth) {
    img.scaleToWidth(options.maxWidth);
  }
  if (options.maxHeight && img.height && img.height > options.maxHeight) {
    img.scaleToHeight(options.maxHeight);
  }

  img.set('id', options.id || generateElementId());
  img.set('elementType', 'IMAGE');
  img.set('left', 100);
  img.set('top', 100);

  return img;
};

// Convert Fabric object to DeckSlideElement for saving
export const fabricObjectToElement = (
  obj: FabricObject,
  slideId: string,
  canvasWidth: number,
  canvasHeight: number
): Partial<DeckSlideElement> => {
  const scaledWidth = obj.getScaledWidth();
  const scaledHeight = obj.getScaledHeight();
  // Normalize to the top-left corner regardless of the object's origin.
  // elementToFabricObject reloads everything with a default (top-left) origin,
  // so storing a center/right/bottom-origin left/top would drift the object on
  // every save→reload (images are added with originX/Y 'center').
  let left = obj.left || 0;
  let top = obj.top || 0;
  if (obj.originX === 'center') left -= scaledWidth / 2;
  else if (obj.originX === 'right') left -= scaledWidth;
  if (obj.originY === 'center') top -= scaledHeight / 2;
  else if (obj.originY === 'bottom') top -= scaledHeight;
  const angle = obj.angle || 0;

  const base = {
    x: pixelToPercent(left, canvasWidth),
    y: pixelToPercent(top, canvasHeight),
    width: pixelToPercent(scaledWidth, canvasWidth),
    height: pixelToPercent(scaledHeight, canvasHeight),
    rotation: angle,
    zIndex: obj.get('zIndex') || 0,
    // Persist flip state so Shift+H / Shift+V flips survive a save → reload.
    // Stored on the element root; elementToFabricObject re-applies them.
    flipX: !!obj.flipX,
    flipY: !!obj.flipY,
  };

  const elementType = obj.get('elementType') as string;

  // Object-styling fields common to text + shapes (shadow + lock). Only emit
  // keys when present so we don't bloat content / overwrite with defaults.
  const shadow = serializeShadow(obj);
  const isLocked = !!obj.get('lockMovementX') || !!(obj as any).isLocked;
  const stylingExtras: Record<string, any> = {};
  if (shadow) stylingExtras.shadow = shadow;
  if (isLocked) stylingExtras.isLocked = true;

  if (elementType === 'TEXT' && obj instanceof IText) {
    const textObj = obj as any;
    // Per-character styles map (partial/range formatting). Fabric stores this
    // as styles[lineIndex][charIndex] = { ...overrides }. Persist verbatim so
    // partial bold/color/highlight survives reload.
    const stylesMap = textObj.styles && Object.keys(textObj.styles).length > 0 ? textObj.styles : undefined;
    return {
      ...base,
      type: 'TEXT',
      content: {
        text: obj.text,
        fontSize: obj.fontSize,
        fontFamily: obj.fontFamily,
        fontWeight: obj.fontWeight,
        fontStyle: obj.fontStyle,
        fill: obj.fill,
        textAlign: obj.textAlign,
        underline: obj.underline,
        linethrough: obj.linethrough,
        // line/letter spacing: export reads content.lineHeight + letterSpacing(px).
        lineHeight: obj.lineHeight,
        // charSpacing is fabric's 1/1000-em unit; persist it directly for an
        // exact in-editor round-trip and ALSO expose letterSpacing for export.
        charSpacing: obj.charSpacing,
        // Whole-object highlight → fabric textBackgroundColor; export-friendly
        // alias backgroundColor kept in sync.
        textBackgroundColor: textObj.textBackgroundColor || undefined,
        backgroundColor: textObj.textBackgroundColor || undefined,
        // Per-range styles map (partial formatting).
        styles: stylesMap,
        // List + vertical-align + paragraph spacing + autofit + hyperlink.
        listType: textObj.listType || undefined,
        verticalAlign: textObj.verticalAlign || undefined,
        spaceBefore: textObj.spaceBefore || undefined,
        spaceAfter: textObj.spaceAfter || undefined,
        autofit: textObj.autofit || undefined,
        link: textObj.link || undefined,
        ...stylingExtras,
      },
    };
  }

  if (elementType === 'IMAGE' && obj instanceof FabricImage) {
    return {
      ...base,
      type: 'IMAGE',
      content: {
        url: obj.getSrc(),
      },
    };
  }

  if (elementType === 'SHAPE') {
    let shapeType = obj.get('shapeType') || 'RECT';

    // A gradient fill is an object, not a string. Persist it as content.gradient
    // and store a solid fallback color in content.fill (so the export — which
    // expects a string fill — still renders something sensible).
    const rawFill = obj.get('fill');
    const gradient = serializeGradient(rawFill, obj.width || 0, obj.height || 0);
    const fillForContent = gradient ? gradient.stops[0]?.color || '#e0e0e0' : rawFill;

    return {
      ...base,
      type: 'SHAPE',
      content: {
        shapeType,
        fill: fillForContent,
        gradient,
        stroke: obj.get('stroke'),
        strokeWidth: obj.get('strokeWidth'),
        strokeDashArray: obj.get('strokeDashArray') || undefined,
        rx: obj.get('rx'),
        ry: obj.get('ry'),
        ...stylingExtras,
      },
    };
  }

  // ICON / TABLE / CHART: single elements drawn as a fabric Group. Geometry is
  // already captured in `base` (top-left normalised, scaled w/h). The source
  // content lives on the instance (elementContent + typed alias), so emit it
  // verbatim — the visual rebuilds from content on reload via the builders.
  if (elementType === 'ICON') {
    const content = (obj.get('elementContent') as any) || { svg: obj.get('iconSvg') };
    return { ...base, type: 'ICON' as any, content: { ...content, ...stylingExtras } };
  }
  if (elementType === 'TABLE') {
    const content = (obj.get('elementContent') as any) || obj.get('tableData');
    return { ...base, type: 'TABLE' as any, content: { ...content, ...stylingExtras } };
  }
  if (elementType === 'CHART') {
    const content = (obj.get('elementContent') as any) || obj.get('chartData');
    return { ...base, type: 'CHART' as any, content: { ...content, ...stylingExtras } };
  }

  // Image placeholders & videos are loaded onto the canvas with non-canonical
  // elementTypes; map them back to a real element type so a save never silently
  // drops them (a transient image-load failure must not delete the image).
  if (elementType === 'VIDEO') {
    return { ...base, type: 'VIDEO', content: { url: obj.get('videoUrl') } };
  }
  if (elementType === 'placeholder') {
    return { ...base, type: 'IMAGE', content: { placeholder: obj.get('placeholder') } };
  }
  if (elementType === 'IMAGE_PLACEHOLDER') {
    return { ...base, type: 'IMAGE', content: { url: obj.get('originalUrl') } };
  }

  return base;
};

// Load DeckSlideElement to Fabric object
export const elementToFabricObject = async (
  element: DeckSlideElement,
  canvasWidth: number,
  canvasHeight: number
): Promise<FabricObject | null> => {
  const left = percentToPixel(element.x, canvasWidth);
  const top = percentToPixel(element.y, canvasHeight);
  const width = percentToPixel(element.width, canvasWidth);
  const height = percentToPixel(element.height, canvasHeight);

  // flipX/flipY are serialized on the element root, but the backend folds them
  // into content (DeckSlideElement has no flip columns), so read either source.
  const flipX = !!(element as any).flipX || !!(element.content as any)?.flipX;
  const flipY = !!(element as any).flipY || !!(element.content as any)?.flipY;

  const baseOptions = {
    id: element.id,
    left,
    top,
    angle: element.rotation || 0,
    flipX,
    flipY,
  };

  if (element.type === 'TEXT') {
    const content = element.content as any;
    const text = createTextObject(content.text || 'Text', {
      ...baseOptions,
      fontSize: content.fontSize || 24,
      fontFamily: content.fontFamily || 'Inter, sans-serif',
      fontWeight: content.fontWeight || 'normal',
      fontStyle: content.fontStyle || 'normal',
      fill: content.fill || '#000000',
      textAlign: content.textAlign || 'left',
      underline: content.underline || false,
      linethrough: content.linethrough || false,
      lineHeight: content.lineHeight ?? 1.16,
      charSpacing: content.charSpacing ?? 0,
    });

    const t = text as any;
    // Whole-object highlight.
    if (content.textBackgroundColor || content.backgroundColor) {
      t.set('textBackgroundColor', content.textBackgroundColor || content.backgroundColor);
    }
    // Per-character styles map (partial range formatting).
    if (content.styles && typeof content.styles === 'object') {
      t.styles = content.styles;
    }
    // Custom (non-fabric-core) props — kept on the instance so they re-serialize
    // through fabricObjectToElement on the next save and drive load-time layout.
    if (content.listType) t.listType = content.listType;
    if (content.verticalAlign) t.verticalAlign = content.verticalAlign;
    if (content.spaceBefore) t.spaceBefore = content.spaceBefore;
    if (content.spaceAfter) t.spaceAfter = content.spaceAfter;
    if (content.autofit) t.autofit = content.autofit;
    if (content.link) t.link = content.link;
    // Shadow + lock.
    const shadow = shadowFromContent(content.shadow);
    if (shadow) t.set('shadow', shadow);
    applyLockState(text, content.isLocked);
    return text;
  }

  if (element.type === 'IMAGE' || (element.type as string) === 'image') {
    const content = element.content as any;

    console.log('[elementToFabricObject] Loading IMAGE element:', {
      elementId: element.id,
      contentType: typeof content,
      contentKeys: Object.keys(content || {}),
      content: JSON.stringify(content),
      hasUrl: !!content?.url,
      hasPlaceholder: !!content?.placeholder,
    });

    // Handle placeholder elements (saved as IMAGE type with placeholder content)
    if (content.placeholder) {
      console.log('[elementToFabricObject] Loading placeholder element:', element.id);
      const rect = createRectObject({
        ...baseOptions,
        width,
        height,
        fill: '#f9fafb',
        stroke: '#d1d5db',
        strokeWidth: 2,
        rx: 8,
        ry: 8,
      });
      rect.set('id', element.id);
      rect.set('elementType', 'placeholder');
      rect.set('placeholder', content.placeholder);
      return rect;
    }

    if (content.url) {
      console.log('[elementToFabricObject] Loading image from URL:', content.url);
      try {
        const img = await createImageObject(content.url, { id: element.id });
        img.set('left', left);
        img.set('top', top);
        img.set('flipX', flipX);
        img.set('flipY', flipY);
        img.scaleToWidth(width);
        console.log('[elementToFabricObject] Successfully loaded image:', element.id);
        return img;
      } catch (e) {
        console.error('[elementToFabricObject] Failed to load image from URL:', {
          elementId: element.id,
          url: content.url,
          error: e,
        });
        // Return placeholder rect on error
        const placeholder = createRectObject({
          ...baseOptions,
          width,
          height,
          fill: '#f0f0f0',
          stroke: '#cccccc',
        });
        placeholder.set('elementType', 'IMAGE_PLACEHOLDER');
        // Keep the original URL so re-saving the slide preserves the image
        // element instead of dropping it after a transient load failure.
        placeholder.set('originalUrl', content.url);
        return placeholder;
      }
    }

    console.log('[elementToFabricObject] IMAGE element has no url or placeholder, returning null:', {
      elementId: element.id,
      content: JSON.stringify(content),
    });
    return null;
  }

  if (element.type === 'SHAPE') {
    const content = element.content as any;
    const shapeType = content.shapeType || 'RECT';
    const shapeOptions: Record<string, any> = {
      ...baseOptions,
      fill: content.fill || '#e0e0e0',
      stroke: content.stroke || '#333333',
      strokeWidth: content.strokeWidth || 2,
      strokeDashArray: content.strokeDashArray || undefined,
    };

    let shapeObj: FabricObject;
    switch (shapeType) {
      case 'CIRCLE':
        shapeObj = createCircleObject({ ...shapeOptions, radius: Math.min(width, height) / 2 });
        break;
      case 'ELLIPSE':
        shapeObj = createEllipseObject({ ...shapeOptions, rx: width / 2, ry: height / 2 });
        break;
      case 'TRIANGLE':
        shapeObj = createTriangleObject({ ...shapeOptions, width, height });
        break;
      case 'LINE':
        shapeObj = createLineObject([0, 0, width, 0], shapeOptions);
        break;
      case 'ARROW':
        shapeObj = createArrowObject(shapeOptions);
        break;
      case 'STAR':
        shapeObj = createStarObject(shapeOptions);
        break;
      case 'CALLOUT':
        shapeObj = createCalloutObject(shapeOptions);
        break;
      case 'RECT':
      default:
        shapeObj = createRectObject({
          ...shapeOptions,
          width,
          height,
          rx: content.rx || 0,
          ry: content.ry || 0,
        });
        break;
    }

    // Restore gradient fill (sized to the object's local box), shadow, lock.
    const gradient = gradientFromContent(
      content.gradient,
      shapeObj.width || width,
      shapeObj.height || height,
    );
    if (gradient) shapeObj.set('fill', gradient as any);
    const shadow = shadowFromContent(content.shadow);
    if (shadow) shapeObj.set('shadow', shadow);
    applyLockState(shapeObj, content.isLocked);
    return shapeObj;
  }

  if ((element.type as string) === 'ICON') {
    const content = element.content as IconContent;
    const group = await buildIconObject(content, width, height, {
      id: element.id,
      left,
      top,
      angle: element.rotation || 0,
      flipX,
      flipY,
      zIndex: element.zIndex || 0,
    });
    applyLockState(group, (content as any)?.isLocked);
    return group;
  }

  if ((element.type as string) === 'TABLE') {
    const content = element.content as TableContent;
    const group = buildTableObject(content, width, height, {
      id: element.id,
      left,
      top,
      angle: element.rotation || 0,
      flipX,
      flipY,
      zIndex: element.zIndex || 0,
    });
    applyLockState(group, (content as any)?.isLocked);
    return group;
  }

  if ((element.type as string) === 'CHART') {
    const content = element.content as ChartContent;
    const group = buildChartObject(content, width, height, {
      id: element.id,
      left,
      top,
      angle: element.rotation || 0,
      flipX,
      flipY,
      zIndex: element.zIndex || 0,
    });
    applyLockState(group, (content as any)?.isLocked);
    return group;
  }

  if (element.type === 'VIDEO') {
    // Videos are represented as image placeholders with play icon
    const content = element.content as any;
    const placeholder = createRectObject({
      ...baseOptions,
      width,
      height,
      fill: '#1a1a1a',
      stroke: '#333333',
    });
    placeholder.set('elementType', 'VIDEO');
    placeholder.set('videoUrl', content.url);
    return placeholder;
  }

  return null;
};

/* ------------------------------------------------------------------ */
/* GROUP / UNGROUP                                                      */
/*                                                                      */
/* Persistence model (documented MVP): a Group is a *live editing*      */
/* convenience. Fabric serializes Groups natively, so groups round-trip */
/* through the per-slide undo history and the realtime-collab snapshots  */
/* (both go through canvas.loadFromJSON). For the DB element path        */
/* (fabricObjectToElement, one element per top-level object) a Group     */
/* cannot expand 1→N, so DeckCanvas auto-ungroups a Group the moment it  */
/* would be persisted (in its object:modified handler). After that the   */
/* children are top-level objects with baked world transforms and save   */
/* correctly. Net effect: groups always survive reload — either as a     */
/* live group (undo/collab) or transparently dissolved into their        */
/* children (DB save → reload).                                          */
/* ------------------------------------------------------------------ */

// Group the current multi-selection (ActiveSelection) into a real Group.
// Returns the new Group, or null when there's nothing groupable.
export const groupActiveSelection = (canvas: FabricCanvas): Group | null => {
  const active = canvas.getActiveObject();
  if (!active || !(active instanceof ActiveSelection)) return null;

  // Fabric v6: ActiveSelection.toGroup-style flow — pull the live objects out
  // of the selection (which preserves their world transforms) and wrap them.
  const objects = active.removeAll();
  const group = new Group(objects);
  group.set('id', generateElementId());
  group.set('elementType', 'GROUP');

  canvas.add(group);
  canvas.setActiveObject(group);
  canvas.requestRenderAll();
  return group;
};

// Ungroup a Group back into individual canvas objects with world transforms
// baked in. Returns the released children (re-selected as an ActiveSelection).
export const ungroupActiveGroup = (canvas: FabricCanvas): FabricObject[] => {
  const active = canvas.getActiveObject();
  if (!active || !(active instanceof Group)) return [];

  // removeAll() pops children out applying the group's transform to each, so
  // they land exactly where they appeared inside the group.
  const objects = (active as Group).removeAll();
  canvas.remove(active);
  objects.forEach((obj) => {
    // Children that lost their id (e.g. nested) get a fresh one so they persist.
    if (!obj.get('id')) obj.set('id', generateElementId());
    canvas.add(obj);
  });

  if (objects.length > 0) {
    const selection = new ActiveSelection(objects, { canvas });
    canvas.setActiveObject(selection);
  }
  canvas.requestRenderAll();
  return objects;
};

/* ------------------------------------------------------------------ */
/* SNAP / SMART GUIDES                                                  */
/* ------------------------------------------------------------------ */

export interface SnapTarget {
  // Candidate snap coordinates in scene space.
  v: number[]; // vertical lines (x positions): left / center / right edges
  h: number[]; // horizontal lines (y positions): top / middle / bottom edges
}

// Snap lines (in scene space) to draw while dragging.
export interface ActiveGuide {
  orientation: 'v' | 'h';
  position: number; // x for vertical, y for horizontal
}

const SNAP_THRESHOLD = 6;

// Bounding box of an object in scene (canvas) coordinates, accounting for
// scale/flip. Uses aCoords so rotated objects still report sensible edges.
const objectBounds = (obj: FabricObject) => {
  const w = obj.getScaledWidth();
  const h = obj.getScaledHeight();
  // Normalise to top-left regardless of origin.
  let left = obj.left || 0;
  let top = obj.top || 0;
  if (obj.originX === 'center') left -= w / 2;
  else if (obj.originX === 'right') left -= w;
  if (obj.originY === 'center') top -= h / 2;
  else if (obj.originY === 'bottom') top -= h;
  return { left, top, width: w, height: h, right: left + w, bottom: top + h, cx: left + w / 2, cy: top + h / 2 };
};

// Collect snap candidates from every other object plus the slide bounds.
export const collectSnapTargets = (
  canvas: FabricCanvas,
  moving: FabricObject,
  slideWidth: number,
  slideHeight: number
): SnapTarget => {
  const v: number[] = [0, slideWidth / 2, slideWidth];
  const h: number[] = [0, slideHeight / 2, slideHeight];

  canvas.getObjects().forEach((obj) => {
    if (obj === moving) return;
    if ((obj as any).__isGuide) return;
    const b = objectBounds(obj);
    v.push(b.left, b.cx, b.right);
    h.push(b.top, b.cy, b.bottom);
  });

  return { v, h };
};

// Given the moving object's current bounds and the snap targets, compute the
// snapped left/top deltas and which guide lines to draw. Returns null deltas
// when no snap applies on that axis.
export const computeSnap = (
  moving: FabricObject,
  targets: SnapTarget
): { left?: number; top?: number; guides: ActiveGuide[] } => {
  const b = objectBounds(moving);
  const guides: ActiveGuide[] = [];

  // For vertical guides we test the object's left / center / right against
  // every candidate x; pick the closest within threshold.
  const xEdges = [
    { val: b.left, adjust: 0 },
    { val: b.cx, adjust: -b.width / 2 },
    { val: b.right, adjust: -b.width },
  ];
  let bestX: { dist: number; left: number; line: number } | null = null;
  for (const edge of xEdges) {
    for (const target of targets.v) {
      const dist = Math.abs(edge.val - target);
      if (dist <= SNAP_THRESHOLD && (!bestX || dist < bestX.dist)) {
        bestX = { dist, left: target + edge.adjust, line: target };
      }
    }
  }

  const yEdges = [
    { val: b.top, adjust: 0 },
    { val: b.cy, adjust: -b.height / 2 },
    { val: b.bottom, adjust: -b.height },
  ];
  let bestY: { dist: number; top: number; line: number } | null = null;
  for (const edge of yEdges) {
    for (const target of targets.h) {
      const dist = Math.abs(edge.val - target);
      if (dist <= SNAP_THRESHOLD && (!bestY || dist < bestY.dist)) {
        bestY = { dist, top: target + edge.adjust, line: target };
      }
    }
  }

  const result: { left?: number; top?: number; guides: ActiveGuide[] } = { guides };
  if (bestX) {
    // Convert snapped top-left back to the object's own origin space.
    let left = bestX.left;
    if (moving.originX === 'center') left += b.width / 2;
    else if (moving.originX === 'right') left += b.width;
    result.left = left;
    guides.push({ orientation: 'v', position: bestX.line });
  }
  if (bestY) {
    let top = bestY.top;
    if (moving.originY === 'center') top += b.height / 2;
    else if (moving.originY === 'bottom') top += b.height;
    result.top = top;
    guides.push({ orientation: 'h', position: bestY.line });
  }
  return result;
};
