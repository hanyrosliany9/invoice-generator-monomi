import React from 'react';
import { Card, Form, Input, Select, InputNumber, Switch, Divider, Typography, Space, theme, ColorPicker } from 'antd';
import { Widget, DataSource } from '../../types/report-builder';

const { Title, Text } = Typography;
const { Option } = Select;
const { useToken } = theme;

interface PropertiesPanelProps {
  widget: Widget;
  dataSource: DataSource;
  onChange: (updates: Partial<Widget>) => void;
}

export const PropertiesPanel: React.FC<PropertiesPanelProps> = ({ widget, dataSource, onChange }) => {
  const { token } = useToken();

  const handleConfigChange = (key: string, value: any) => {
    onChange({
      config: {
        ...(widget.config as any),
        [key]: value,
      } as any,
    });
  };

  const renderChartProperties = () => {
    if (widget.type !== 'chart') return null;

    const config = widget.config as any;
    const numberColumns = dataSource.columns.filter((c) => c.type === 'NUMBER').map((c) => c.name);
    const allColumns = dataSource.columns.map((c) => c.name);

    return (
      <>
        <Form.Item label="Chart Type">
          <Select value={config.chartType} onChange={(v) => handleConfigChange('chartType', v)}>
            <Option value="line">Line Chart</Option>
            <Option value="bar">Bar Chart</Option>
            <Option value="area">Area Chart</Option>
            <Option value="pie">Pie Chart</Option>
          </Select>
        </Form.Item>

        <Form.Item label="Title">
          <Input value={config.title} onChange={(e) => handleConfigChange('title', e.target.value)} />
        </Form.Item>

        {(config.chartType === 'line' || config.chartType === 'bar' || config.chartType === 'area') && (
          <>
            <Form.Item label="X-Axis">
              <Select
                value={config.xAxis}
                onChange={(v) => handleConfigChange('xAxis', v)}
                placeholder="Select column"
              >
                {allColumns.map((col) => (
                  <Option key={col} value={col}>
                    {col}
                  </Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item label="Y-Axis (Metrics)">
              <Select
                mode="multiple"
                value={config.yAxis || []}
                onChange={(v) => handleConfigChange('yAxis', v)}
                placeholder="Select metrics"
              >
                {numberColumns.map((col) => (
                  <Option key={col} value={col}>
                    {col}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </>
        )}

        {config.chartType === 'pie' && (
          <>
            <Form.Item label="Name Field (Labels)">
              <Select
                value={config.nameKey}
                onChange={(v) => handleConfigChange('nameKey', v)}
                placeholder="Select column"
              >
                {allColumns.map((col) => (
                  <Option key={col} value={col}>
                    {col}
                  </Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item label="Value Field">
              <Select
                value={config.valueKey}
                onChange={(v) => handleConfigChange('valueKey', v)}
                placeholder="Select column"
              >
                {numberColumns.map((col) => (
                  <Option key={col} value={col}>
                    {col}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </>
        )}

        <Form.Item label="Show Legend">
          <Switch
            checked={config.showLegend}
            onChange={(v) => handleConfigChange('showLegend', v)}
          />
        </Form.Item>

        <Form.Item label="Show Grid">
          <Switch checked={config.showGrid} onChange={(v) => handleConfigChange('showGrid', v)} />
        </Form.Item>
      </>
    );
  };

  const renderTextProperties = () => {
    if (widget.type !== 'text') return null;

    const config = widget.config as any;

    return (
      <>
        <Form.Item label="Font Size">
          <Space.Compact>
            <InputNumber
              value={config.fontSize || 14}
              onChange={(v) => handleConfigChange('fontSize', v || 14)}
              min={8}
              max={72}
              style={{ width: 'calc(100% - 40px)' }}
            />
            <Input value="px" disabled style={{ width: 40, textAlign: 'center' }} />
          </Space.Compact>
        </Form.Item>

        <Form.Item label="Font Weight">
          <Select
            value={config.fontWeight || 400}
            onChange={(v) => handleConfigChange('fontWeight', v)}
          >
            <Option value={300}>Light</Option>
            <Option value={400}>Normal</Option>
            <Option value={600}>Semi Bold</Option>
            <Option value={700}>Bold</Option>
          </Select>
        </Form.Item>

        <Form.Item label="Alignment">
          <Select
            value={config.alignment || 'left'}
            onChange={(v) => handleConfigChange('alignment', v)}
          >
            <Option value="left">Left</Option>
            <Option value="center">Center</Option>
            <Option value="right">Right</Option>
            <Option value="justify">Justify</Option>
          </Select>
        </Form.Item>
      </>
    );
  };

  const renderMetricProperties = () => {
    if (widget.type !== 'metric') return null;

    const config = widget.config as any;
    const numberColumns = dataSource.columns.filter((c) => c.type === 'NUMBER').map((c) => c.name);

    return (
      <>
        <Form.Item label="Title">
          <Input value={config.title} onChange={(e) => handleConfigChange('title', e.target.value)} />
        </Form.Item>

        <Form.Item label="Value Column">
          <Select
            value={config.valueKey}
            onChange={(v) => handleConfigChange('valueKey', v)}
            placeholder="Select column"
          >
            {numberColumns.map((col) => (
              <Option key={col} value={col}>
                {col}
              </Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item label="Aggregation">
          <Select
            value={config.aggregation}
            onChange={(v) => handleConfigChange('aggregation', v)}
          >
            <Option value="sum">Sum</Option>
            <Option value="average">Average</Option>
            <Option value="count">Count</Option>
            <Option value="min">Minimum</Option>
            <Option value="max">Maximum</Option>
          </Select>
        </Form.Item>

        <Form.Item label="Decimal Places">
          <InputNumber
            value={config.precision}
            onChange={(v) => handleConfigChange('precision', v || 0)}
            min={0}
            max={6}
          />
        </Form.Item>

        <Form.Item label="Prefix">
          <Input
            value={config.prefix || ''}
            onChange={(e) => handleConfigChange('prefix', e.target.value)}
            placeholder="e.g., $"
          />
        </Form.Item>

        <Form.Item label="Suffix">
          <Input
            value={config.suffix || ''}
            onChange={(e) => handleConfigChange('suffix', e.target.value)}
            placeholder="e.g., %"
          />
        </Form.Item>
      </>
    );
  };

  const renderDividerProperties = () => {
    if (widget.type !== 'divider') return null;

    const config = widget.config as any;

    return (
      <>
        <Form.Item label="Thickness">
          <Space.Compact>
            <InputNumber
              value={config.thickness || 1}
              onChange={(v) => handleConfigChange('thickness', v || 1)}
              min={1}
              max={10}
              style={{ width: 'calc(100% - 40px)' }}
            />
            <Input value="px" disabled style={{ width: 40, textAlign: 'center' }} />
          </Space.Compact>
        </Form.Item>

        <Form.Item label="Style">
          <Select value={config.style || 'solid'} onChange={(v) => handleConfigChange('style', v)}>
            <Option value="solid">Solid</Option>
            <Option value="dashed">Dashed</Option>
            <Option value="dotted">Dotted</Option>
          </Select>
        </Form.Item>
      </>
    );
  };

  const renderCalloutProperties = () => {
    if (widget.type !== 'callout') return null;

    const config = widget.config as any;

    return (
      <>
        <Form.Item label="Type">
          <Select value={config.type} onChange={(v) => handleConfigChange('type', v)}>
            <Option value="info">Info</Option>
            <Option value="success">Success</Option>
            <Option value="warning">Warning</Option>
            <Option value="error">Error</Option>
          </Select>
        </Form.Item>

        <Form.Item label="Title">
          <Input
            value={config.title || ''}
            onChange={(e) => handleConfigChange('title', e.target.value)}
            placeholder="Optional title"
          />
        </Form.Item>

        <Form.Item label="Show Icon">
          <Switch
            checked={config.showIcon !== false}
            onChange={(v) => handleConfigChange('showIcon', v)}
          />
        </Form.Item>
      </>
    );
  };

  const renderTableProperties = () => {
    if (widget.type !== 'table') return null;

    const config = widget.config as any;
    const allColumns = dataSource.columns.map((c) => c.name);

    return (
      <>
        <Form.Item label="Columns to Show">
          <Select
            mode="multiple"
            value={config.columns || allColumns}
            onChange={(v) => handleConfigChange('columns', v)}
            placeholder="All columns"
          >
            {allColumns.map((col) => (
              <Option key={col} value={col}>
                {col}
              </Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item label="Show Header">
          <Switch
            checked={config.showHeader !== false}
            onChange={(v) => handleConfigChange('showHeader', v)}
          />
        </Form.Item>

        <Form.Item label="Bordered">
          <Switch
            checked={config.bordered !== false}
            onChange={(v) => handleConfigChange('bordered', v)}
          />
        </Form.Item>

        <Form.Item label="Striped Rows">
          <Switch checked={config.striped} onChange={(v) => handleConfigChange('striped', v)} />
        </Form.Item>

        <Form.Item label="Max Rows">
          <InputNumber
            value={config.maxRows}
            onChange={(v) => handleConfigChange('maxRows', v)}
            placeholder="Unlimited"
            min={1}
          />
        </Form.Item>
      </>
    );
  };

  const widgetTypeLabels: Record<string, string> = {
    chart: 'Chart',
    text: 'Text Block',
    metric: 'Metric Card',
    divider: 'Divider',
    callout: 'Callout',
    table: 'Data Table',
  };

  return (
    <div
      style={{
        height: '100%',
        overflowY: 'auto',
        padding: token.paddingLG,
        background: token.colorBgContainer,
      }}
    >
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <div>
          <Title level={5} style={{ margin: 0 }}>
            {widgetTypeLabels[widget.type]} Properties
          </Title>
          <Text type="secondary" style={{ fontSize: 12 }}>
            Configure your widget
          </Text>
        </div>

        <Divider style={{ margin: `${token.marginXS}px 0` }} />

        <Form layout="vertical" size="small">
          {renderChartProperties()}
          {renderTextProperties()}
          {renderMetricProperties()}
          {renderDividerProperties()}
          {renderCalloutProperties()}
          {renderTableProperties()}

          <Divider style={{ margin: `${token.marginMD}px 0` }} />

          <div>
            <Text type="secondary" strong style={{ fontSize: 12 }}>
              Layout
            </Text>
          </div>

          <Form.Item label="Width">
            <Text>{widget.layout.w} columns</Text>
          </Form.Item>

          <Form.Item label="Height">
            <Text>{widget.layout.h} rows</Text>
          </Form.Item>

          <div
            style={{
              marginTop: token.marginMD,
              padding: token.paddingSM,
              background: token.colorInfoBg,
              borderRadius: token.borderRadiusLG,
              border: `1px solid ${token.colorInfoBorder}`,
            }}
          >
            <Text type="secondary" style={{ fontSize: 11 }}>
              💡 <strong>Tip:</strong> Drag the widget to reposition, use resize handles to adjust dimensions.
            </Text>
          </div>
        </Form>
      </Space>
    </div>
  );
};

export default PropertiesPanel;
