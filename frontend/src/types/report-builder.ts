/**
 * Dynamic Report Builder Type Definitions
 * Inspired by Google Looker Studio + Google Slides + Notion
 */

import type { Layout, LayoutItem } from 'react-grid-layout';

// ==================== Widget Types ====================

export type WidgetType = 'chart' | 'text' | 'metric' | 'image' | 'divider' | 'callout' | 'table';

export type ChartType = 'line' | 'bar' | 'area' | 'pie';

// ==================== Widget Configuration ====================

export interface BaseWidget {
  id: string;
  type: WidgetType;
  layout: LayoutItem;
  sectionId?: string; // Track which section this widget belongs to (for multi-section mode)
}

export interface ChartWidget extends BaseWidget {
  type: 'chart';
  config: ChartConfig;
}

export interface TextWidget extends BaseWidget {
  type: 'text';
  config: TextConfig;
}

export interface MetricWidget extends BaseWidget {
  type: 'metric';
  config: MetricConfig;
}

export interface ImageWidget extends BaseWidget {
  type: 'image';
  config: ImageConfig;
}

export interface DividerWidget extends BaseWidget {
  type: 'divider';
  config: DividerConfig;
}

export interface CalloutWidget extends BaseWidget {
  type: 'callout';
  config: CalloutConfig;
}

export interface TableWidget extends BaseWidget {
  type: 'table';
  config: TableConfig;
}

export type Widget =
  | ChartWidget
  | TextWidget
  | MetricWidget
  | ImageWidget
  | DividerWidget
  | CalloutWidget
  | TableWidget;

// ==================== Configuration Types ====================

export interface ChartConfig {
  chartType: ChartType;
  title: string;
  xAxis?: string;
  yAxis?: string[];
  nameKey?: string;
  valueKey?: string;
  colors?: string[];
  showLegend?: boolean;
  showGrid?: boolean;
  showDataLabels?: boolean;
}

export interface TextConfig {
  content: any; // Slate.js JSON value
  plainText?: string; // Plain text version for PDF export
  alignment?: 'left' | 'center' | 'right' | 'justify';
  fontSize?: number;
  fontWeight?: number;
}

export interface MetricConfig {
  title: string;
  valueKey: string;
  aggregation: 'sum' | 'average' | 'count' | 'min' | 'max';
  precision: number;
  prefix?: string;
  suffix?: string;
  showTrend?: boolean;
  trendCompareKey?: string;
  backgroundColor?: string;
  textColor?: string;
}

export interface ImageConfig {
  url: string;
  alt?: string;
  fit?: 'contain' | 'cover' | 'fill';
  caption?: string;
}

export interface DividerConfig {
  thickness?: number;
  color?: string;
  style?: 'solid' | 'dashed' | 'dotted';
}

export interface CalloutConfig {
  type: 'info' | 'warning' | 'success' | 'error';
  title?: string;
  content: any; // Slate.js JSON value
  icon?: string;
  showIcon?: boolean;
}

export interface TableConfig {
  columns?: string[];
  showHeader?: boolean;
  striped?: boolean;
  bordered?: boolean;
  maxRows?: number;
}

// ==================== Report Layout ====================

export interface ReportLayout {
  widgets: Widget[];
  cols: number;
  rowHeight: number;
  layoutVersion: number;
}

// ==================== Builder State ====================

export interface BuilderState {
  widgets: Widget[];
  selectedWidgetId: string | null;
  clipboardWidget: Widget | null;
  history: ReportLayout[];
  historyIndex: number;
  zoom: number;
  gridEnabled: boolean;
}

// ==================== Component Palette ====================

export interface WidgetPaletteItem {
  type: WidgetType;
  label: string;
  icon: React.ReactNode;
  description: string;
  defaultConfig: any;
  defaultLayout: Partial<Layout>;
}

// ==================== Data Binding ====================

export interface ColumnInfo {
  name: string;
  type: 'DATE' | 'NUMBER' | 'STRING';
  sample?: any;
}

export interface DataSource {
  columns: ColumnInfo[];
  rows: any[];
  rowCount: number;
}

// ==================== Editor Props ====================

export interface WidgetEditorProps<T = any> {
  widget: Widget & { config: T };
  dataSource: DataSource;
  onChange: (config: T) => void;
}

// ==================== Helper Types ====================

export interface WidgetDragItem {
  type: 'palette-item' | 'existing-widget';
  widgetType: WidgetType;
  widgetId?: string;
}

export interface GridPosition {
  x: number;
  y: number;
  w: number;
  h: number;
}

// ==================== Constants ====================

export const DEFAULT_GRID_COLS = 12;
export const DEFAULT_ROW_HEIGHT = 30;
export const MIN_WIDGET_WIDTH = 2;
export const MIN_WIDGET_HEIGHT = 2;

export const WIDGET_DEFAULTS: Record<WidgetType, Partial<LayoutItem>> = {
  chart: { w: 6, h: 8, minW: 4, minH: 6 },
  text: { w: 12, h: 4, minW: 2, minH: 2 },
  metric: { w: 3, h: 4, minW: 2, minH: 3 },
  image: { w: 4, h: 6, minW: 2, minH: 3 },
  divider: { w: 12, h: 1, minW: 2, minH: 1, maxH: 1 },
  callout: { w: 12, h: 4, minW: 4, minH: 3 },
  table: { w: 12, h: 10, minW: 6, minH: 6 },
};
