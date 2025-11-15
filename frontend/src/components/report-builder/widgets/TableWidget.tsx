import React from 'react';
import { Table, theme } from 'antd';
import { TableWidget as TableWidgetType, DataSource } from '../../../types/report-builder';

const { useToken } = theme;

interface TableWidgetProps {
  widget: TableWidgetType;
  dataSource: DataSource;
  onChange: (updates: Partial<TableWidgetType>) => void;
}

export const TableWidget: React.FC<TableWidgetProps> = ({ widget, dataSource }) => {
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

  // Show ALL rows - no pagination, no virtual scroll, no height limits (same as PDF)
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

export default TableWidget;
