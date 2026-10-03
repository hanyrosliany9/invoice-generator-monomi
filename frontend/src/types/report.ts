export type ReportStatus = 'DRAFT' | 'COMPLETED' | 'SENT';

export type DataType = 'DATE' | 'NUMBER' | 'STRING';

export interface ColumnTypes {
  [columnName: string]: DataType;
}

export interface VisualizationConfig {
  type: 'line' | 'bar' | 'pie' | 'area' | 'table' | 'metric_card';
  title: string;
  xAxis?: string;
  yAxis?: string[];
  groupBy?: string;
  metric?: string;
  aggregation?: 'sum' | 'average' | 'count' | 'min' | 'max' | 'latest';
  colors?: string[];
  nameKey?: string; // For pie charts
  valueKey?: string; // For pie charts and metric cards
  precision?: number; // For metric cards
}

export type SectionSource = 'file' | 'manual' | 'metrics';

export type ColumnKind = 'date' | 'number' | 'percent' | 'currency' | 'text';

export interface ReportSection {
  id: string;
  reportId: string;
  order: number;
  title: string;
  description?: string;
  csvFileName: string;
  csvFilePath?: string;
  importedAt: string;
  columnTypes: ColumnTypes;
  rawData: any[];
  rowCount: number;
  visualizations: VisualizationConfig[];
  /** `columnOrder`/`source` are written by the importer (JSON storage loses key order). */
  layout?: {
    columnOrder?: string[];
    /** "instagram" = auto-filled from synced Instagram insights. */
    source?: SectionSource | 'instagram';
    /** Instagram sections: grid kind (headline numbers vs table). */
    instagramKind?: 'table' | 'metrics';
    widgets?: any[];
    cols?: number;
    rowHeight?: number;
    layoutVersion?: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface SocialMediaReport {
  id: string;
  projectId: string;
  title: string;
  description?: string;
  month: number;
  year: number;
  status: ReportStatus;
  pdfUrl?: string;
  /** Set by the client-portal API only (stored PDF or renderable on demand). */
  hasPdf?: boolean;
  pdfGeneratedAt?: string;
  pdfVersion: number;
  emailedAt?: string;
  emailedTo?: string[];
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
  project?: {
    id: string;
    number: string;
    description: string;
    client?: {
      id: string;
      name: string;
    };
  };
  sections?: ReportSection[];
}

export interface UpdateReportDto {
  title?: string;
  description?: string;
  month?: number;
  year?: number;
}

export interface SendRecipients {
  client: { id: string; name: string; isInternal: boolean };
  contacts: { id: string; name: string; email: string }[];
  reportUrl: string;
  lastEmailedAt?: string | null;
  lastEmailedTo?: string[];
}

export interface SendResult {
  report: SocialMediaReport;
  sent: number;
  failed: number;
  results: { email: string; name: string; ok: boolean; error?: string }[];
  reportUrl: string;
}

export interface CreateReportDto {
  projectId: string;
  title: string;
  description?: string;
  month: number;
  year: number;
}

export interface AddSectionDto {
  title: string;
  description?: string;
}

/** Typed column of the manual entry grid. */
export interface GridColumn {
  name: string;
  type: ColumnKind;
}

export type GridCell = string | number;

export interface ManualSectionDto {
  title?: string;
  description?: string;
  kind?: 'table' | 'metrics';
  columns: GridColumn[];
  rows: GridCell[][];
}

/** Dates in a data set that fall outside the report's month. */
export interface PeriodMismatch {
  column: string;
  total: number;
  outside: number;
  /** YYYY-MM-DD */
  min: string;
  max: string;
}

/** What replacing a section's data does to its charts. */
export interface ChartImpact {
  before: number;
  kept: string[];
  removed: string[];
  /** The old charts are replaced by automatically suggested ones. */
  regenerated: boolean;
  created: number;
}

/** What the importer found in a file (nothing is saved yet). */
export interface FilePreview {
  fileName: string;
  headers: string[];
  columnTypes: ColumnTypes;
  columnKinds: Record<string, ColumnKind>;
  rowCount: number;
  rows: Record<string, string | number>[];
  warnings: string[];
  /** Month/year of the target report (when previewed for one). */
  period?: { month: number; year: number } | null;
  periodMismatch?: PeriodMismatch | null;
  chartImpact?: ChartImpact | null;
}

export interface ReportTemplateInfo {
  key: string;
  title: string;
  description: string;
  headers: string[];
}

/** A section as returned after an import: includes non-fatal notes. */
export type ImportedSection = ReportSection & { warnings?: string[]; chartImpact?: ChartImpact };

export interface UpdateVisualizationsDto {
  visualizations: VisualizationConfig[];
}
