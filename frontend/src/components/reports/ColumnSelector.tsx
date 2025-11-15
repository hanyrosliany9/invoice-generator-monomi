import React, { useState, useEffect } from 'react';
import { Checkbox, Space, Typography, Alert, Divider, theme } from 'antd';
import type { CheckboxChangeEvent } from 'antd/es/checkbox';

const { Text } = Typography;
const { useToken } = theme;

interface ColumnSelectorProps {
  columns: string[];
  value?: string[];
  onChange?: (selectedColumns: string[]) => void;
}

export const ColumnSelector: React.FC<ColumnSelectorProps> = ({
  columns,
  value = [],
  onChange,
}) => {
  const { token } = useToken();
  const [selectedColumns, setSelectedColumns] = useState<string[]>(value.length > 0 ? value : columns);
  const [indeterminate, setIndeterminate] = useState(false);
  const [checkAll, setCheckAll] = useState(true);

  useEffect(() => {
    setSelectedColumns(value.length > 0 ? value : columns);
    setCheckAll(value.length === columns.length);
    setIndeterminate(value.length > 0 && value.length < columns.length);
  }, [columns, value]);

  const handleSelectColumn = (column: string, checked: boolean) => {
    const newSelected = checked
      ? [...selectedColumns, column]
      : selectedColumns.filter((c) => c !== column);

    setSelectedColumns(newSelected);
    setCheckAll(newSelected.length === columns.length);
    setIndeterminate(newSelected.length > 0 && newSelected.length < columns.length);
    onChange?.(newSelected);
  };

  const handleCheckAllChange = (e: CheckboxChangeEvent) => {
    const newSelected = e.target.checked ? columns : [];
    setSelectedColumns(newSelected);
    setCheckAll(e.target.checked);
    setIndeterminate(false);
    onChange?.(newSelected);
  };

  if (columns.length === 0) {
    return (
      <Alert
        message="No columns available"
        description="Please upload a CSV file first to select columns"
        type="info"
        showIcon
      />
    );
  }

  return (
    <div>
      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        <div>
          <Checkbox
            indeterminate={indeterminate}
            onChange={handleCheckAllChange}
            checked={checkAll}
          >
            <Text strong>Select All ({selectedColumns.length}/{columns.length} selected)</Text>
          </Checkbox>
        </div>

        <Divider style={{ margin: '8px 0' }} />

        <div
          style={{
            maxHeight: '300px',
            overflowY: 'auto',
            padding: token.paddingXS,
            border: `1px solid ${token.colorBorder}`,
            borderRadius: token.borderRadiusLG,
            background: token.colorBgLayout,
          }}
        >
          <Space direction="vertical" style={{ width: '100%' }}>
            {columns.map((column) => (
              <Checkbox
                key={column}
                checked={selectedColumns.includes(column)}
                onChange={(e) => handleSelectColumn(column, e.target.checked)}
              >
                {column}
              </Checkbox>
            ))}
          </Space>
        </div>

        {selectedColumns.length === 0 && (
          <Alert
            message="At least one column required"
            description="Please select at least one column to include in the report"
            type="warning"
            showIcon
            style={{ marginTop: '8px' }}
          />
        )}

        <Text type="secondary" style={{ fontSize: '12px' }}>
          💡 Tip: Deselect columns you don't want to include in charts and tables
        </Text>
      </Space>
    </div>
  );
};

export default ColumnSelector;
