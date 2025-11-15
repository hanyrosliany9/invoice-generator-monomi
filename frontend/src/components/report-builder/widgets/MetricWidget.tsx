import React from 'react';
import { Statistic, Card, theme } from 'antd';
import { ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons';
import { MetricWidget as MetricWidgetType, DataSource } from '../../../types/report-builder';

const { useToken } = theme;

interface MetricWidgetProps {
  widget: MetricWidgetType;
  dataSource: DataSource;
  onChange: (updates: Partial<MetricWidgetType>) => void;
}

export const MetricWidget: React.FC<MetricWidgetProps> = ({ widget, dataSource }) => {
  const { token } = useToken();

  // Calculate metric value from data
  const values = dataSource.rows
    .map((row) => row[widget.config.valueKey])
    .filter((v) => typeof v === 'number' || !isNaN(parseFloat(v)))
    .map((v) => parseFloat(v));

  let metricValue = 0;
  if (values.length > 0) {
    switch (widget.config.aggregation) {
      case 'sum':
        metricValue = values.reduce((acc, val) => acc + val, 0);
        break;
      case 'average':
        metricValue = values.reduce((acc, val) => acc + val, 0) / values.length;
        break;
      case 'count':
        metricValue = dataSource.rows.length;
        break;
      case 'max':
        metricValue = Math.max(...values);
        break;
      case 'min':
        metricValue = Math.min(...values);
        break;
    }
  }

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: widget.config.backgroundColor || token.colorBgContainer,
        borderRadius: token.borderRadiusLG,
      }}
    >
      <Statistic
        title={widget.config.title}
        value={metricValue}
        precision={widget.config.precision}
        prefix={widget.config.prefix}
        suffix={widget.config.suffix}
        valueStyle={{
          color: widget.config.textColor || token.colorPrimary,
          fontSize: '32px',
          fontWeight: 'bold',
        }}
      />
    </div>
  );
};

export default MetricWidget;
