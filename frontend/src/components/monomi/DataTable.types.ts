import type { ColumnDef, RowData } from '@tanstack/react-table';

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
