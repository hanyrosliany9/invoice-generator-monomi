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
  aggregation?: 'sum' | 'average' | 'count' | 'min' | 'max';
  colors?: string[];
  nameKey?: string; // For pie charts
  valueKey?: string; // For pie charts and metric cards
  precision?: number; // For metric cards
}

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
  layout?: {
    widgets: any[];
    cols: number;
    rowHeight: number;
    layoutVersion: number;
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

export interface UpdateVisualizationsDto {
  visualizations: VisualizationConfig[];
}
