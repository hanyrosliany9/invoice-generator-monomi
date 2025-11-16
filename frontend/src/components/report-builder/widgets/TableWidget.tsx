import React, { useMemo } from 'react';
import { Table, theme } from 'antd';
import { FixedSizeList as List } from 'react-window';
import { TableWidget as TableWidgetType, DataSource } from '../../../types/report-builder';

const { useToken } = theme;

// Threshold for switching to virtualization
const VIRTUALIZATION_THRESHOLD = 100;

interface TableWidgetProps {
  widget: TableWidgetType;
  dataSource: DataSource;
  onChange: (updates: Partial<TableWidgetType>) => void;
}

const TableWidgetComponent: React.FC<TableWidgetProps> = ({ widget, dataSource }) => {
  const { token } = useToken();

  // Debug logging
  console.log('[TableWidget] Rendering with', dataSource.rows?.length, 'rows, pagination=false');

  if (!dataSource.rows || dataSource.rows.length === 0) {
    return (
      <div style={{ textAlign: 'center', color: token.colorTextSecondary, padding: token.paddingLG }}>
        No data available
      </div>
    );
  }

  // Determine which columns to show
  const columnsToShow = widget.config.columns || Object.keys(dataSource.rows[0]);

  const columns = columnsToShow.map((colName) => {
    const columnInfo = dataSource.columns.find((c) => c.name === colName);
    const isNumber = columnInfo?.type === 'NUMBER';

    return {
      title: colName,
      dataIndex: colName,
      key: colName,
      align: isNumber ? ('right' as const) : ('left' as const),
      sorter: (a: any, b: any) => {
        const aVal = a[colName];
        const bVal = b[colName];
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return aVal - bVal;
        }
        return String(aVal).localeCompare(String(bVal));
      },
      render: (value: any) => {
        if (value === null || value === undefined || value === '') {
          return <span style={{ color: token.colorTextTertiary }}>-</span>;
        }
        if (isNumber && typeof value === 'number') {
          return value.toLocaleString('id-ID');
        }
        return String(value);
      },
    };
  });

  const rowCount = dataSource.rows.length;
  const useVirtualization = rowCount >= VIRTUALIZATION_THRESHOLD;

  // Virtualized table for large datasets (100+ rows)
  if (useVirtualization) {
    const ROW_HEIGHT = 35;
    const HEADER_HEIGHT = 40;
    const MAX_HEIGHT = 600;
    const listHeight = Math.min(rowCount * ROW_HEIGHT, MAX_HEIGHT);

    const columnWidths = useMemo(() => {
      const totalCols = columnsToShow.length;
      return columnsToShow.map(() => `${100 / totalCols}%`);
    }, [columnsToShow.length]);

    const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => {
      const row = dataSource.rows[index];
      return (
        <div
          style={{
            ...style,
            display: 'flex',
            borderBottom: `1px solid ${token.colorBorder}`,
            fontSize: '12px',
          }}
          className="hover:bg-gray-50"
        >
          {columnsToShow.map((colName, colIndex) => {
            const value = row[colName];
            const columnInfo = dataSource.columns.find((c) => c.name === colName);
            const isNumber = columnInfo?.type === 'NUMBER';

            let displayValue: React.ReactNode = '-';
            if (value !== null && value !== undefined && value !== '') {
              if (isNumber && typeof value === 'number') {
                displayValue = value.toLocaleString('id-ID');
              } else {
                displayValue = String(value);
              }
            }

            return (
              <div
                key={colName}
                style={{
                  width: columnWidths[colIndex],
                  padding: '8px 12px',
                  textAlign: isNumber ? 'right' : 'left',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {displayValue === '-' ? (
                  <span style={{ color: token.colorTextTertiary }}>{displayValue}</span>
                ) : (
                  displayValue
                )}
              </div>
            );
          })}
        </div>
      );
    };

    return (
      <div
        style={{ width: '100%', height: 'auto' }}
        data-table-rows={rowCount}
        data-virtualized="true"
      >
        {/* Header */}
        {widget.config.showHeader !== false && (
          <div
            style={{
              display: 'flex',
              height: HEADER_HEIGHT,
              backgroundColor: token.colorBgContainer,
              borderBottom: `2px solid ${token.colorBorder}`,
              fontWeight: 600,
              fontSize: '12px',
            }}
          >
            {columnsToShow.map((colName, colIndex) => {
              const columnInfo = dataSource.columns.find((c) => c.name === colName);
              const isNumber = columnInfo?.type === 'NUMBER';

              return (
                <div
                  key={colName}
                  style={{
                    width: columnWidths[colIndex],
                    padding: '8px 12px',
                    textAlign: isNumber ? 'right' : 'left',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {colName}
                </div>
              );
            })}
          </div>
        )}

        {/* Virtualized rows */}
        <List
          height={listHeight}
          itemCount={rowCount}
          itemSize={ROW_HEIGHT}
          width="100%"
          style={{ border: widget.config.bordered ? `1px solid ${token.colorBorder}` : 'none' }}
        >
          {Row}
        </List>

        {/* Row count indicator for large tables */}
        <div
          style={{
            padding: '4px 8px',
            fontSize: '11px',
            color: token.colorTextSecondary,
            backgroundColor: token.colorBgLayout,
            textAlign: 'right',
            borderTop: `1px solid ${token.colorBorder}`,
          }}
        >
          Showing {rowCount.toLocaleString()} rows (virtualized for performance)
        </div>
      </div>
    );
  }

  // Regular Ant Design table for small datasets (< 100 rows)
  return (
    <div
      style={{ width: '100%', height: 'auto', minHeight: '100%', overflow: 'visible' }}
      data-table-rows={dataSource.rows.length}
      data-pagination-disabled="true"
    >
      <Table
        columns={columns}
        dataSource={dataSource.rows}
        rowKey={(record, index) => {
          // Generate stable key from row content hash or use index
          const uniqueField = record.id || record._id || record.key;
          if (uniqueField !== undefined) return String(uniqueField);

          // Use index as fallback (stable for non-editable tables)
          return `row-${index}`;
        }}
        pagination={false}
        size="small"
        bordered={widget.config.bordered}
        showHeader={widget.config.showHeader !== false}
        scroll={undefined}
        style={{
          fontSize: '12px',
          width: '100%',
        }}
        className="report-table-no-pagination"
      />
    </div>
  );
};

// Wrap with React.memo to prevent unnecessary re-renders
export const TableWidget = React.memo(
  TableWidgetComponent,
  (prevProps, nextProps) => {
    return (
      prevProps.widget.id === nextProps.widget.id &&
      JSON.stringify(prevProps.widget.config) === JSON.stringify(nextProps.widget.config) &&
      prevProps.dataSource === nextProps.dataSource
    );
  }
);

TableWidget.displayName = 'TableWidget';

export default TableWidget;
