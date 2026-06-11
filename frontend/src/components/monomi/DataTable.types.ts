import type { ColumnDef, RowData } from '@tanstack/react-table';

// Per-column horizontal alignment, applied to BOTH the header and its cells so
// the column reads as one clean vertical line (finance/Excel expectation).
// Use `meta: { align: 'right' }` on numeric/money columns.
declare module '@tanstack/react-table' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData extends RowData, TValue> {
    align?: 'left' | 'right' | 'center';
  }
}

export interface DataTableProps<TData extends RowData, TValue = unknown> {
  data: TData[];
  columns: ColumnDef<TData, TValue>[];
  enableSorting?: boolean;
  enableFiltering?: boolean;
  enableColumnVisibility?: boolean;
  enablePagination?: boolean;
  enableRowSelection?: boolean;
  enableExpanding?: boolean;
  density?: 'compact' | 'comfortable';
  toolbar?: React.ReactNode;
  emptyState?: React.ReactNode;
  onRowClick?: (row: TData) => void;
}
