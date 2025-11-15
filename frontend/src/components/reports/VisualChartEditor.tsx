import React from 'react';
import { Select, Input, Button, Space, Card, Divider, InputNumber, Typography, theme } from 'antd';
import { PlusOutlined, MinusCircleOutlined } from '@ant-design/icons';
import { VisualizationConfig, ColumnTypes } from '../../types/report';

const { Option } = Select;
const { Text } = Typography;
const { useToken } = theme;

interface VisualChartEditorProps {
  columnTypes: ColumnTypes;
  value?: VisualizationConfig[];
  onChange?: (visualizations: VisualizationConfig[]) => void;
}

export const VisualChartEditor: React.FC<VisualChartEditorProps> = ({
  columnTypes,
  value = [],
  onChange,
}) => {
  const { token } = useToken();

  // Use value prop directly (controlled component) instead of internal state
  const visualizations = Array.isArray(value) ? value : [];

  const handleChange = (newVisualizations: VisualizationConfig[]) => {
    onChange?.(newVisualizations);
  };

  const addVisualization = () => {
    const newViz: VisualizationConfig = {
      type: 'line',
      title: 'New Chart',
      xAxis: '',
      yAxis: [],
    };
    handleChange([...visualizations, newViz]);
  };

  const updateVisualization = (index: number, updates: Partial<VisualizationConfig>) => {
    const updated = [...visualizations];
    updated[index] = { ...updated[index], ...updates };

    // Ensure yAxis is always an array for line/bar/area charts
    // IMPORTANT: Convert string to array, don't just set to empty array!
    if (updates.type === 'line' || updates.type === 'bar' || updates.type === 'area') {
      const currentYAxis = updated[index].yAxis;
      if (!Array.isArray(currentYAxis)) {
        // Convert string yAxis to single-element array (preserve data!)
        if (currentYAxis && typeof currentYAxis === 'string') {
          updated[index].yAxis = [currentYAxis];
        } else {
          // Only set to empty array if truly undefined/null
          updated[index].yAxis = [];
        }
      }
    }

    handleChange(updated);
  };

  const removeVisualization = (index: number) => {
    handleChange(visualizations.filter((_, i) => i !== index));
  };

  // Get columns by type for filtering
  const getColumnsByType = (type: 'DATE' | 'NUMBER' | 'STRING') => {
    return Object.entries(columnTypes)
      .filter(([_, colType]) => colType === type)
      .map(([colName]) => colName);
  };

  const dateColumns = getColumnsByType('DATE');
  const numberColumns = getColumnsByType('NUMBER');
  const stringColumns = getColumnsByType('STRING');
  const allColumns = Object.keys(columnTypes);

  // Helper component for form field labels
  const FormField: React.FC<{
    label: string;
    required?: boolean;
    help?: string;
    children: React.ReactNode;
  }> = ({ label, required, help, children }) => (
    <div style={{ marginBottom: token.marginMD }}>
      <div style={{ marginBottom: token.marginXS }}>
        <Text strong>
          {label}
          {required && <span style={{ color: token.colorError, marginLeft: '4px' }}>*</span>}
        </Text>
      </div>
      {children}
      {help && (
        <div style={{ marginTop: token.marginXXS }}>
          <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
            {help}
          </Text>
        </div>
      )}
    </div>
  );

  return (
    <div>
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        {visualizations.map((viz, index) => (
          <Card
            key={index}
            title={`Chart ${index + 1}: ${viz.title}`}
            size="small"
            extra={
              <Button
                type="text"
                danger
                size="small"
                icon={<MinusCircleOutlined />}
                onClick={() => removeVisualization(index)}
                htmlType="button"
              >
                Remove
              </Button>
            }
          >
            <div>
              {/* Chart Type */}
              <FormField label="Chart Type" required>
                <Select
                  value={viz.type}
                  onChange={(type) => updateVisualization(index, { type })}
                  style={{ width: '100%' }}
                >
                  <Option value="line">Line Chart</Option>
                  <Option value="bar">Bar Chart</Option>
                  <Option value="area">Area Chart</Option>
                  <Option value="pie">Pie Chart</Option>
                  <Option value="table">Data Table</Option>
                  <Option value="metric_card">Metric Card</Option>
                </Select>
              </FormField>

              {/* Chart Title */}
              <FormField label="Chart Title" required>
                <Input
                  value={viz.title}
                  onChange={(e) => updateVisualization(index, { title: e.target.value })}
                  placeholder="e.g., Monthly Revenue Trend"
                />
              </FormField>

              {/* Configuration based on chart type */}
              {(viz.type === 'line' || viz.type === 'bar' || viz.type === 'area') && (
                <>
                  <FormField label="X-Axis (Horizontal)" required>
                    <Select
                      value={viz.xAxis}
                      onChange={(xAxis) => updateVisualization(index, { xAxis })}
                      placeholder="Select column for X-axis"
                      style={{ width: '100%' }}
                    >
                      {allColumns.map((col) => (
                        <Option key={col} value={col}>
                          {col} ({columnTypes[col]})
                        </Option>
                      ))}
                    </Select>
                  </FormField>

                  <FormField label="Y-Axis (Vertical) - Select one or more metrics" required>
                    <Select
                      mode="multiple"
                      value={Array.isArray(viz.yAxis) ? viz.yAxis : []}
                      onChange={(yAxis) => updateVisualization(index, { yAxis })}
                      placeholder="Select columns for Y-axis"
                      style={{ width: '100%' }}
                    >
                      {numberColumns.map((col) => (
                        <Option key={col} value={col}>
                          {col}
                        </Option>
                      ))}
                    </Select>
                  </FormField>
                </>
              )}

              {viz.type === 'pie' && (
                <>
                  <FormField label="Name Field (Labels)" required>
                    <Select
                      value={viz.nameKey}
                      onChange={(nameKey) => updateVisualization(index, { nameKey })}
                      placeholder="Select column for labels"
                      style={{ width: '100%' }}
                    >
                      {allColumns.map((col) => (
                        <Option key={col} value={col}>
                          {col} ({columnTypes[col]})
                        </Option>
                      ))}
                    </Select>
                  </FormField>

                  <FormField label="Value Field (Numbers)" required>
                    <Select
                      value={viz.valueKey}
                      onChange={(valueKey) => updateVisualization(index, { valueKey })}
                      placeholder="Select column for values"
                      style={{ width: '100%' }}
                    >
                      {numberColumns.map((col) => (
                        <Option key={col} value={col}>
                          {col}
                        </Option>
                      ))}
                    </Select>
                  </FormField>
                </>
              )}

              {viz.type === 'metric_card' && (
                <>
                  <FormField label="Value Column" required>
                    <Select
                      value={viz.valueKey}
                      onChange={(valueKey) => updateVisualization(index, { valueKey })}
                      placeholder="Select column to display"
                      style={{ width: '100%' }}
                    >
                      {numberColumns.map((col) => (
                        <Option key={col} value={col}>
                          {col}
                        </Option>
                      ))}
                    </Select>
                  </FormField>

                  <FormField label="Aggregation Method">
                    <Select
                      value={viz.aggregation || 'sum'}
                      onChange={(aggregation) => updateVisualization(index, { aggregation })}
                      style={{ width: '100%' }}
                    >
                      <Option value="sum">Sum</Option>
                      <Option value="average">Average</Option>
                      <Option value="count">Count</Option>
                      <Option value="min">Minimum</Option>
                      <Option value="max">Maximum</Option>
                    </Select>
                  </FormField>

                  <FormField label="Decimal Places">
                    <InputNumber
                      value={viz.precision || 2}
                      onChange={(precision) => updateVisualization(index, { precision: precision || 2 })}
                      min={0}
                      max={6}
                      style={{ width: '100%' }}
                    />
                  </FormField>
                </>
              )}

              {viz.type === 'table' && (
                <FormField label="Note" help="Table will display all columns from your data">
                  <div style={{ padding: token.paddingXS, background: token.colorBgLayout, borderRadius: token.borderRadiusLG }}>
                    The table visualization will show all available columns with proper formatting.
                  </div>
                </FormField>
              )}
            </div>
          </Card>
        ))}

        <Button
          type="dashed"
          onClick={addVisualization}
          icon={<PlusOutlined />}
          block
          htmlType="button"
        >
          Add Chart
        </Button>
      </Space>
    </div>
  );
};

export default VisualChartEditor;
