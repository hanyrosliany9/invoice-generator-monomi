import { useState } from 'react';
import { useIsMobile } from '@/hooks/useIsMobile';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getExpandedRowModel,
  flexRender,
  type SortingState,
  type ColumnFiltersState,
  type VisibilityState,
} from '@tanstack/react-table';
import { ChevronDown, ChevronUp, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DataTableProps } from './DataTable.types';

export function DataTable<TData, TValue = unknown>({
  data,
  columns,
  enableSorting = true,
  enableFiltering = false,
  enableColumnVisibility = false,
  enablePagination = true,
  enableRowSelection = false,
  enableExpanding = false,
  density = 'comfortable',
  toolbar,
  emptyState,
  onRowClick,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [filters, setFilters] = useState<ColumnFiltersState>([]);
  const [visibility, setVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState({});

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnFilters: filters,
      columnVisibility: visibility,
      rowSelection,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setFilters,
    onColumnVisibilityChange: setVisibility,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    ...(enableSorting && { getSortedRowModel: getSortedRowModel() }),
    ...(enableFiltering && { getFilteredRowModel: getFilteredRowModel() }),
    ...(enablePagination && { getPaginationRowModel: getPaginationRowModel() }),
    ...(enableExpanding && { getExpandedRowModel: getExpandedRowModel() }),
    enableRowSelection,
  });

  const isMobile = useIsMobile();
  const effectiveDensity = isMobile ? 'compact' : density;
  const rowPadding = effectiveDensity === 'compact' ? 'px-3 py-2' : 'px-4 py-3.5';

  return (
    <div className="w-full space-y-3">
      {toolbar && <div>{toolbar}</div>}
      <div className="relative rounded-md border border-border-subtle bg-bg-sunken overflow-x-auto overflow-y-hidden">
        <div className="absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-bg-sunken/95 to-transparent pointer-events-none z-10" />
        <table className="w-full min-w-max font-body text-sm">
          <thead className="border-b border-border-subtle">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((header) => {
                  const canSort = enableSorting && header.column.getCanSort();
                  const align = header.column.columnDef.meta?.align ?? 'left';
                  return (
                    <th
                      key={header.id}
                      className={cn(
                        'text-[10px] uppercase tracking-[0.14em] font-medium text-text-tertiary px-4 py-3',
                        // Header alignment matches the cells below so the column
                        // is one straight vertical line (header + values agree).
                        align === 'right'
                          ? 'text-right'
                          : align === 'center'
                            ? 'text-center'
                            : 'text-left',
                        canSort &&
                          'cursor-pointer select-none hover:text-text-secondary transition-colors',
                      )}
                      onClick={
                        canSort
                          ? header.column.getToggleSortingHandler()
                          : undefined
                      }
                    >
                      <span
                        className={cn(
                          'inline-flex items-center gap-1.5',
                          // For right-aligned columns put the sort caret on the
                          // LEFT so the header label stays flush to the right edge,
                          // lined up with the numbers underneath.
                          align === 'right' && 'flex-row-reverse',
                        )}
                      >
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                        {canSort && (
                          {
                            asc: <ChevronUp className="h-3 w-3 text-text-secondary" />,
                            desc: <ChevronDown className="h-3 w-3 text-text-secondary" />,
                          }[header.column.getIsSorted() as string] ?? (
                            <ChevronsUpDown className="h-3 w-3 opacity-30" />
                          )
                        )}
                      </span>
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="py-14 text-center text-text-tertiary"
                >
                  {emptyState ?? <span>Tidak ada data</span>}
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className={cn(
                    'border-b border-border-subtle/60 last:border-0',
                    'hover:bg-accent-navy-soft transition-colors',
                    onRowClick && 'cursor-pointer',
                  )}
                  onClick={
                    onRowClick ? () => onRowClick(row.original) : undefined
                  }
                >
                  {row.getVisibleCells().map((cell) => {
                    const align = cell.column.columnDef.meta?.align ?? 'left';
                    return (
                      <td
                        key={cell.id}
                        className={cn(
                          rowPadding,
                          'text-text-secondary',
                          align === 'right' && 'text-right',
                          align === 'center' && 'text-center',
                        )}
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {enablePagination && (
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-2 sm:justify-between sm:items-center text-xs text-text-tertiary">
          <span>
            Menampilkan {table.getRowModel().rows.length} dari {data.length}
          </span>
          <div className="flex gap-2">
            <button
              className="px-3 py-1.5 rounded-md border border-border-subtle text-text-secondary hover:text-text-primary hover:bg-accent-navy-soft disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              Sebelumnya
            </button>
            <button
              className="px-3 py-1.5 rounded-md border border-border-subtle text-text-secondary hover:text-text-primary hover:bg-accent-navy-soft disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              Berikutnya
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
